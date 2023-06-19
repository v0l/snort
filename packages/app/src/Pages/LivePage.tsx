import "./LivePage.css";
import { parseNostrLink } from "@snort/system";
import { useParams } from "react-router-dom";

import { LiveVideoPlayer } from "Element/LiveVideoPlayer";
import { findTag, unwrap } from "SnortUtils";
import PageSpinner from "Element/PageSpinner";
import { LiveChat } from "Element/LiveChat";
import useEventFeed from "Feed/EventFeed";
import ProfilePreview from "Element/ProfilePreview";
import AsyncButton from "Element/AsyncButton";
import { FormattedMessage } from "react-intl";
import Icon from "Icons/Icon";

export function LivePage() {
  const params = useParams();
  const link = parseNostrLink(unwrap(params.id));
  const thisEvent = useEventFeed(link);

  if (!thisEvent.data) {
    return <PageSpinner />;
  }

  return (
    <div className="live-page main-content">
      <div>
        <LiveVideoPlayer stream={unwrap(findTag(thisEvent.data, "streaming"))} autoPlay={true} />
        <div className="flex">
          <div className="f-grow">
            <h1>{findTag(thisEvent.data, "title")}</h1>
            <p>{findTag(thisEvent.data, "summary")}</p>
            <div>
              {thisEvent.data?.tags
                .filter(a => a[0] === "t")
                .map(a => a[1])
                .map(a => (
                  <div className="pill" key={a}>
                    {a}
                  </div>
                ))}
            </div>
          </div>
          <div>
            <ProfilePreview
              pubkey={thisEvent.data.pubkey}
              className="g10"
              options={{
                about: false,
              }}
              actions={
                <div className="flex">
                  <AsyncButton onClick={() => {}}>
                    <Icon name="zap" size={16} className="mr5" />
                    <FormattedMessage defaultMessage="Zap" />
                  </AsyncButton>
                </div>
              }
            />
          </div>
        </div>
      </div>
      <LiveChat ev={thisEvent.data} link={link} />
    </div>
  );
}
