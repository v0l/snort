import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { useSelector, useDispatch } from "react-redux";
import Timeline from "Element/Timeline";
import useEventPublisher from "Feed/EventPublisher";
import { setTags } from "State/Login";
import type { RootState } from "State/Store";

const HashTagsPage = () => {
  const params = useParams();
  const tag = (params.tag ?? "").toLowerCase();
  const dispatch = useDispatch();
  const { tags } = useSelector((s: RootState) => s.login);
  const isFollowing = useMemo(() => {
    return tags.includes(tag);
  }, [tags, tag]);
  const publisher = useEventPublisher();

  function followTags(ts: string[]) {
    dispatch(
      setTags({
        tags: ts,
        createdAt: new Date().getTime(),
      })
    );
    publisher.tags(ts).then(ev => publisher.broadcast(ev));
  }

  return (
    <>
      <div className="main-content">
        <div className="action-heading">
          <h2>#{tag}</h2>
          {isFollowing ? (
            <button type="button" className="secondary" onClick={() => followTags(tags.filter(t => t !== tag))}>
              <FormattedMessage defaultMessage="Unfollow" />
            </button>
          ) : (
            <button type="button" onClick={() => followTags(tags.concat([tag]))}>
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
