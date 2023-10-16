import { useIntl, FormattedMessage } from "react-intl";
import { useNavigate, Link } from "react-router-dom";

import { DeveloperAccounts } from "Const";
import Logo from "Element/Logo";
import FollowListBase from "Element/User/FollowListBase";
import { clearEntropy } from "Login";
import useLogin from "Hooks/useLogin";
import TrendingUsers from "Element/TrendingUsers";

import messages from "./messages";

export default function DiscoverFollows() {
  const { formatMessage } = useIntl();
  const login = useLogin();
  const navigate = useNavigate();

  async function clearEntropyAndGo() {
    clearEntropy(login);
    navigate("/");
  }

  return (
    <div className="main-content new-user p" dir="auto">
      <Logo />
      <div className="progress-bar">
        <div className="progress"></div>
      </div>
      <h1>
        <FormattedMessage {...messages.Ready} />
      </h1>
      <p>
        <FormattedMessage {...messages.Share} values={{ link: <Link to="/">{formatMessage(messages.World)}</Link> }} />
      </p>
      <div className="next-actions continue-actions">
        <button type="button" onClick={() => clearEntropyAndGo()}>
          <FormattedMessage {...messages.Done} />{" "}
        </button>
      </div>
      <h3>
        <FormattedMessage
          defaultMessage="{site_name} Developers"
          values={{
            site_name: CONFIG.appNameCapitalized,
          }}
        />
      </h3>
      {DeveloperAccounts.length > 0 && <FollowListBase pubkeys={DeveloperAccounts} showAbout={true} />}
      <h3>
        <FormattedMessage defaultMessage="Trending Users" />
      </h3>
      <TrendingUsers />
    </div>
  );
}
