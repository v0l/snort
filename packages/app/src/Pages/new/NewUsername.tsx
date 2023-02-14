import { useState } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";

import Logo from "Element/Logo";
import useEventPublisher from "Feed/EventPublisher";

import messages from "./messages";

export default function NewUserName() {
  const [username, setUsername] = useState("");
  const { formatMessage } = useIntl();
  const publisher = useEventPublisher();
  const navigate = useNavigate();

  const onNext = async () => {
    if (username.length > 0) {
      const ev = await publisher.metadata({ name: username });
      console.debug(ev);
      publisher.broadcast(ev);
    }
    navigate("/new/verify");
  };

  return (
    <div className="main-content new-user" dir="auto">
      <Logo />
      <div className="progress-bar">
        <div className="progress progress-second"></div>
      </div>
      <h1>
        <FormattedMessage {...messages.PickUsername} />
      </h1>
      <p>
        <FormattedMessage {...messages.UsernameHelp} />
      </p>
      <h2>
        <FormattedMessage {...messages.Username} />
      </h2>
      <input
        className="username"
        placeholder={formatMessage(messages.UsernamePlaceholder)}
        type="text"
        value={username}
        onChange={ev => setUsername(ev.target.value)}
      />
      <div className="help-text">
        <FormattedMessage defaultMessage="You can change your username at any point." />
      </div>
      <div className="next-actions">
        <button type="button" className="transparent" onClick={() => navigate("/new/verify")}>
          <FormattedMessage {...messages.Skip} />
        </button>
        <button type="button" onClick={onNext}>
          <FormattedMessage {...messages.Next} />
        </button>
      </div>
    </div>
  );
}
