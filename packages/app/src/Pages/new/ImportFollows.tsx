import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useIntl, FormattedMessage } from "react-intl";

import { ApiHost } from "Const";
import AsyncButton from "Element/AsyncButton";
import FollowListBase from "Element/FollowListBase";
import { RootState } from "State/Store";
import { bech32ToHex } from "Util";
import { useNavigate } from "react-router-dom";

import messages from "./messages";

const TwitterFollowsApi = `${ApiHost}/api/v1/twitter/follows-for-nostr`;

export default function ImportFollows() {
  const navigate = useNavigate();
  const currentFollows = useSelector((s: RootState) => s.login.follows);
  const { formatMessage } = useIntl();
  const [twitterUsername, setTwitterUsername] = useState<string>("");
  const [follows, setFollows] = useState<string[]>([]);
  const [error, setError] = useState<string>("");

  const sortedTwitterFollows = useMemo(() => {
    return follows.map(a => bech32ToHex(a)).sort(a => (currentFollows.includes(a) ? 1 : -1));
  }, [follows, currentFollows]);

  async function loadFollows() {
    setFollows([]);
    setError("");
    try {
      const rsp = await fetch(`${TwitterFollowsApi}?username=${twitterUsername}`);
      const data = await rsp.json();
      if (rsp.ok) {
        if (Array.isArray(data) && data.length === 0) {
          setError(formatMessage(messages.NoUsersFound, { twitterUsername }));
        } else {
          setFollows(data);
        }
      } else if ("error" in data) {
        setError(data.error);
      } else {
        setError(formatMessage(messages.FailedToLoad));
      }
    } catch (e) {
      console.warn(e);
      setError(formatMessage(messages.FailedToLoad));
    }
  }

  return (
    <div className="main-content new-user" dir="auto">
      <div className="progress-bar">
        <div className="progress progress-last"></div>
      </div>
      <h1>
        <FormattedMessage {...messages.ImportTwitter} />
      </h1>
      <p>
        <FormattedMessage
          {...messages.FindYourFollows}
          values={{
            provider: (
              <a href="https://nostr.directory" target="_blank" rel="noreferrer">
                nostr.directory
              </a>
            ),
          }}
        />
      </p>
      <h2>
        <FormattedMessage {...messages.TwitterUsername} />
      </h2>
      <div className="flex">
        <input
          type="text"
          placeholder={formatMessage(messages.TwitterPlaceholder)}
          className="f-grow mr10"
          value={twitterUsername}
          onChange={e => setTwitterUsername(e.target.value)}
        />
        <AsyncButton type="button" className="secondary tall" onClick={loadFollows}>
          <FormattedMessage {...messages.Check} />
        </AsyncButton>
      </div>
      {error.length > 0 && <b className="error">{error}</b>}
      <div dir="ltr">
        {sortedTwitterFollows.length > 0 && (
          <FollowListBase
            title={
              <h2>
                <FormattedMessage {...messages.FollowsOnNostr} values={{ username: twitterUsername }} />
              </h2>
            }
            pubkeys={sortedTwitterFollows}
          />
        )}
      </div>

      <div className="next-actions">
        <button className="secondary" type="button" onClick={() => navigate("/new/discover")}>
          <FormattedMessage {...messages.Skip} />
        </button>
        <button type="button" onClick={() => navigate("/new/discover")}>
          <FormattedMessage {...messages.Next} />
        </button>
      </div>
    </div>
  );
}
