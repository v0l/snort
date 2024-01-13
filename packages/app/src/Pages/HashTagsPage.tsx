import { dedupe } from "@snort/shared";
import { EventKind, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import classNames from "classnames";
import { useMemo } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";
import { Link, useParams } from "react-router-dom";

import AsyncButton from "@/Components/Button/AsyncButton";
import Timeline from "@/Components/Feed/Timeline";
import ProfileImage from "@/Components/User/ProfileImage";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import { setTags } from "@/Utils/Login";
import { formatShort } from "@/Utils/Number";

const HashTagsPage = () => {
  const params = useParams();
  const tag = (params.tag ?? "").toLowerCase();
  const subject = useMemo(() => ({ type: "hashtag", items: [tag], discriminator: tag }), [tag]);

  return (
    <>
      <div className="bb p">
        <HashTagHeader tag={tag} />
      </div>
      <Timeline key={tag} subject={subject} postsOnly={false} method={"TIME_RANGE"} />
    </>
  );
};

export default HashTagsPage;

export function HashTagHeader({ tag, events, className }: { tag: string; events?: number; className?: string }) {
  const login = useLogin();
  const isFollowing = useMemo(() => {
    return login.tags.item.includes(tag);
  }, [login, tag]);
  const { publisher, system } = useEventPublisher();

  async function followTags(ts: string[]) {
    if (publisher) {
      const ev = await publisher.generic(eb => {
        eb.kind(EventKind.InterestsList);
        ts.forEach(a => eb.tag(["t", a]));
        return eb;
      });
      setTags(login, ts, ev.created_at * 1000);
      await system.BroadcastEvent(ev);
    }
  }

  const sub = useMemo(() => {
    const rb = new RequestBuilder(`hashtag-counts:${tag}`);
    rb.withFilter().kinds([EventKind.InterestsList]).tag("t", [tag.toLowerCase()]);
    return rb;
  }, [tag]);
  const followsTag = useRequestBuilder(sub);
  const pubkeys = dedupe(followsTag.map(a => a.pubkey));

  return (
    <div className={classNames("flex flex-col", className)}>
      <div className="flex items-center justify-between">
        <div className="flex g8 items-center">
          <b className="text-xl">
            <Link to={`/t/${tag}`}>#{tag}</Link>
          </b>
          {events && (
            <small>
              <FormattedMessage
                defaultMessage="{n} notes"
                id="un1nGw"
                values={{
                  n: formatShort(events),
                }}
              />
            </small>
          )}
        </div>
        {isFollowing ? (
          <AsyncButton className="secondary" onClick={() => followTags(login.tags.item.filter(t => t !== tag))}>
            <FormattedMessage defaultMessage="Unfollow" id="izWS4J" />
          </AsyncButton>
        ) : (
          <AsyncButton onClick={() => followTags(login.tags.item.concat([tag]))}>
            <FormattedMessage defaultMessage="Follow" id="ieGrWo" />
          </AsyncButton>
        )}
      </div>
      <div className="flex items-center">
        {pubkeys.slice(0, 5).map(a => (
          <ProfileImage key={a} pubkey={a} showUsername={false} showFollowDistance={false} size={40} />
        ))}
        {pubkeys.length > 5 && (
          <span>
            +<FormattedNumber value={pubkeys.length - 5} />
          </span>
        )}
      </div>
    </div>
  );
}
