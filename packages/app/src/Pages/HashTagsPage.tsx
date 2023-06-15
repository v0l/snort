import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { FormattedMessage } from "react-intl";

import Timeline from "Element/Timeline";
import useEventPublisher from "Feed/EventPublisher";
import useLogin from "Hooks/useLogin";
import { setTags } from "Login";
import { System } from "index";

const HashTagsPage = () => {
  const params = useParams();
  const tag = (params.tag ?? "").toLowerCase();
  const login = useLogin();
  const isFollowing = useMemo(() => {
    return login.tags.item.includes(tag);
  }, [login, tag]);
  const publisher = useEventPublisher();

  async function followTags(ts: string[]) {
    if (publisher) {
      const ev = await publisher.tags(ts);
      System.BroadcastEvent(ev);
      setTags(login, ts, ev.created_at * 1000);
    }
  }

  return (
    <>
      <div className="main-content">
        <div className="action-heading">
          <h2>#{tag}</h2>
          {isFollowing ? (
            <button
              type="button"
              className="secondary"
              onClick={() => followTags(login.tags.item.filter(t => t !== tag))}>
              <FormattedMessage defaultMessage="Unfollow" />
            </button>
          ) : (
            <button type="button" onClick={() => followTags(login.tags.item.concat([tag]))}>
              <FormattedMessage defaultMessage="Follow" />
            </button>
          )}
        </div>
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
