import { useMemo, useState } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";

import { ApiHost } from "Const";
import Logo from "Element/Logo";
import AsyncButton from "Element/AsyncButton";
import FollowListBase from "Element/FollowListBase";
import { bech32ToHex } from "Util";
import SnortApi from "SnortApi";
import useLogin from "Hooks/useLogin";

import messages from "./messages";

export default function ImportFollows() {
  const navigate = useNavigate();
  const currentFollows = useLogin().follows;
  const { formatMessage } = useIntl();
  const [twitterUsername, setTwitterUsername] = useState<string>("");
  const [follows, setFollows] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const api = new SnortApi(ApiHost);

  const sortedTwitterFollows = useMemo(() => {
    return follows.map(a => bech32ToHex(a)).sort(a => (currentFollows.item.includes(a) ? 1 : -1));
  }, [follows, currentFollows]);

  async function loadFollows() {
    setFollows([]);
    setError("");
    try {
      const rsp = await api.twitterImport(twitterUsername);
      if (Array.isArray(rsp) && rsp.length === 0) {
        setError(formatMessage(messages.NoUsersFound, { twitterUsername }));
      } else {
        setFollows(rsp);
      }
    } catch (e) {
      console.warn(e);
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError(formatMessage(messages.FailedToLoad));
      }
    }
  }

  return (
    <div className="main-content new-user" dir="auto">
      <Logo />
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

      <div className="next-actions continue-actions">
        <button type="button" onClick={() => navigate("/new/discover")}>
          <FormattedMessage {...messages.Next} />
        </button>
      </div>

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
    </div>
  );
}
