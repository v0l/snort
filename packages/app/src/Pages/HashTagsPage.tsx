import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { FormattedMessage, FormattedNumber } from "react-intl";
import { EventKind, NostrHashtagLink, NoteCollection, RequestBuilder } from "@snort/system";
import { dedupe } from "@snort/shared";
import { useRequestBuilder } from "@snort/system-react";

import Timeline from "Element/Feed/Timeline";
import useEventPublisher from "Hooks/useEventPublisher";
import useLogin from "Hooks/useLogin";
import { setTags } from "Login";
import AsyncButton from "Element/AsyncButton";
import ProfileImage from "Element/User/ProfileImage";

const HashTagsPage = () => {
  const params = useParams();
  const tag = (params.tag ?? "").toLowerCase();

  return (
    <>
      <div className="bb p">
        <HashTagHeader tag={tag} />
      </div>
      <Timeline
        key={tag}
        subject={{ type: "hashtag", items: [tag], discriminator: tag }}
        postsOnly={false}
        method={"TIME_RANGE"}
      />
    </>
  );
};

export default HashTagsPage;

export function HashTagHeader({ tag }: { tag: string }) {
  const login = useLogin();
  const isFollowing = useMemo(() => {
    return login.tags.item.includes(tag);
  }, [login, tag]);
  const { publisher, system } = useEventPublisher();

  async function followTags(ts: string[]) {
    if (publisher) {
      const ev = await publisher.bookmarks(
        ts.map(a => new NostrHashtagLink(a)),
        "follow",
      );
      setTags(login, ts, ev.created_at * 1000);
      await system.BroadcastEvent(ev);
    }
  }

  const sub = useMemo(() => {
    const rb = new RequestBuilder(`hashtag-counts:${tag}`);
    rb.withFilter().kinds([EventKind.CategorizedBookmarks]).tag("d", ["follow"]).tag("t", [tag.toLowerCase()]);
    return rb;
  }, [tag]);
  const followsTag = useRequestBuilder(NoteCollection, sub);
  const pubkeys = dedupe((followsTag.data ?? []).map(a => a.pubkey));

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col g8">
        <h2>#{tag}</h2>
        <div className="flex">
          {pubkeys.slice(0, 5).map(a => (
            <ProfileImage pubkey={a} showUsername={false} link={""} showFollowingMark={false} size={40} />
          ))}
          {pubkeys.length > 5 && (
            <span>
              +<FormattedNumber value={pubkeys.length - 5} />
            </span>
          )}
        </div>
      </div>
      {isFollowing ? (
        <AsyncButton className="secondary" onClick={() => followTags(login.tags.item.filter(t => t !== tag))}>
          <FormattedMessage defaultMessage="Unfollow" />
        </AsyncButton>
      ) : (
        <AsyncButton onClick={() => followTags(login.tags.item.concat([tag]))}>
          <FormattedMessage defaultMessage="Follow" />
        </AsyncButton>
      )}
    </div>
  );
}
