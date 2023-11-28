import AsyncButton from "@/Element/Button/AsyncButton";
import AvatarEditor from "@/Element/User/AvatarEditor";
import { useContext, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useLocation, useNavigate } from "react-router-dom";
import { generateNewLogin } from "@/Login";
import { SnortContext } from "@snort/system-react";
import { NotEncrypted } from "@snort/system";
import { NewUserState } from ".";
import { trackEvent } from "@/SnortUtils";

export function Profile() {
  const system = useContext(SnortContext);
  const [picture, setPicture] = useState<string>();
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as NewUserState;

  async function makeRandomKey() {
    try {
      setError("");
      await generateNewLogin(system, key => Promise.resolve(new NotEncrypted(key)), {
        name: state.name,
        picture,
      });
      trackEvent("Login:NewAccount");
      navigate("/login/sign-up/topics");
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      }
    }
  }

  return (
    <div className="flex flex-col g24 text-center">
      <h1>
        <FormattedMessage defaultMessage="Profile Image" id="vN5UH8" />
      </h1>
      <AvatarEditor picture={picture} onPictureChange={p => setPicture(p)} />
      <AsyncButton className="primary" onClick={() => makeRandomKey()}>
        <FormattedMessage defaultMessage="Next" id="9+Ddtu" />
      </AsyncButton>
      {error && <b className="error">{error}</b>}
    </div>
  );
}
