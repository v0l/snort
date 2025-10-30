import { dedupe } from "@snort/shared";
import { EventKind, NostrHashtagLink, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import classNames from "classnames";
import { useMemo } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";
import { Link, useParams } from "react-router-dom";

import AsyncButton from "@/Components/Button/AsyncButton";
import Timeline from "@/Components/Feed/Timeline";
import ProfileImage from "@/Components/User/ProfileImage";
import { TimelineSubject } from "@/Feed/TimelineFeed";
import useLogin from "@/Hooks/useLogin";
import { formatShort } from "@/Utils/Number";
import { AvatarGroup } from "@/Components/User/AvatarGroup";
import useWoT from "@/Hooks/useWoT";

const HashTagsPage = () => {
  const params = useParams();
  const tag = (params.tag ?? "").toLowerCase();
  const subject = useMemo(
    () =>
      ({
        type: "hashtag",
        items: [tag],
        discriminator: tag,
      }) as TimelineSubject,
    [tag],
  );

  return (
    <>
      <div className="bb px-3 py-2">
        <HashTagHeader tag={tag} />
      </div>
      <Timeline key={tag} subject={subject} postsOnly={false} method={"TIME_RANGE"} />
    </>
  );
};

export default HashTagsPage;

export function HashTagHeader({ tag, events, className }: { tag: string; events?: number; className?: string }) {
  const { state } = useLogin(s => ({ v: s.state.version, state: s.state }));
  const isFollowing = useMemo(() => {
    return state.isOnList(EventKind.InterestsList, new NostrHashtagLink(tag));
  }, [state, tag]);

  const sub = useMemo(() => {
    const rb = new RequestBuilder(`hashtag-counts:${tag}`);
    rb.withFilter().kinds([EventKind.InterestsList]).tag("t", [tag.toLowerCase()]);
    return rb;
  }, [tag]);
  const followsTag = useRequestBuilder(sub);
  const wot = useWoT();
  const pubkeys = wot.sortPubkeys(dedupe(followsTag.map(a => a.pubkey)));

  return (
    <div className={classNames("flex flex-col", className)}>
      <div className="flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <b className="text-xl">
            <Link to={`/t/${tag}`}>#{tag}</Link>
          </b>
          {events && (
            <small>
              <FormattedMessage
                defaultMessage="{n} notes"
                values={{
                  n: formatShort(events),
                }}
              />
            </small>
          )}
        </div>
        {isFollowing ? (
          <AsyncButton
            className="secondary"
            onClick={() => state.removeFromList(EventKind.InterestsList, new NostrHashtagLink(tag), true)}>
            <FormattedMessage defaultMessage="Unfollow" />
          </AsyncButton>
        ) : (
          <AsyncButton onClick={() => state.addToList(EventKind.InterestsList, new NostrHashtagLink(tag), true)}>
            <FormattedMessage defaultMessage="Follow" />
          </AsyncButton>
        )}
      </div>
      <div className="flex items-center gap-2">
        <AvatarGroup ids={pubkeys.slice(0, 5)} size={40} />
        {pubkeys.length > 5 && (
          <span>
            +<FormattedNumber value={pubkeys.length - 5} />
          </span>
        )}
      </div>
    </div>
  );
}
