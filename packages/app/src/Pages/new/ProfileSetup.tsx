import { useEffect, useState } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";
import { mapEventToProfile } from "@snort/system";
import { useUserProfile } from "@snort/system-react";

import Logo from "Element/Logo";
import useEventPublisher from "Feed/EventPublisher";
import useLogin from "Hooks/useLogin";
import { UserCache } from "Cache";
import AvatarEditor from "Element/AvatarEditor";
import { DISCOVER } from ".";
import { System } from "index";

import messages from "./messages";

export default function ProfileSetup() {
  const login = useLogin();
  const myProfile = useUserProfile(System, login.publicKey);
  const [username, setUsername] = useState("");
  const [picture, setPicture] = useState("");
  const { formatMessage } = useIntl();
  const publisher = useEventPublisher();
  const navigate = useNavigate();

  useEffect(() => {
    if (myProfile) {
      setUsername(myProfile.name ?? "");
      setPicture(myProfile.picture ?? "");
    }
  }, [myProfile]);

  const onNext = async () => {
    if ((username.length > 0 || picture.length > 0) && publisher) {
      const ev = await publisher.metadata({
        ...myProfile,
        name: username,
        picture,
      });
      System.BroadcastEvent(ev);
      const profile = mapEventToProfile(ev);
      if (profile) {
        UserCache.set(profile);
      }
    }
    navigate(DISCOVER);
  };

  return (
    <div className="main-content new-user" dir="auto">
      <Logo />
      <div className="progress-bar">
        <div className="progress progress-second"></div>
      </div>
      <h1>
        <FormattedMessage defaultMessage="Setup profile" />
      </h1>
      <h2>
        <FormattedMessage defaultMessage="Profile picture" />
      </h2>
      <AvatarEditor picture={picture} onPictureChange={p => setPicture(p)} />
      <h2>
        <FormattedMessage defaultMessage="Username" />
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
        <button type="button" className="transparent" onClick={() => navigate(DISCOVER)}>
          <FormattedMessage {...messages.Skip} />
        </button>
        <button type="button" onClick={onNext}>
          <FormattedMessage {...messages.Next} />
        </button>
      </div>
    </div>
  );
}
