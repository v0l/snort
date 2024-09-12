import { NotEncrypted } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import { useContext, useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useLocation, useNavigate } from "react-router-dom";

import AsyncButton from "@/Components/Button/AsyncButton";
import AvatarEditor from "@/Components/User/AvatarEditor";
import { trackEvent } from "@/Utils";
import { generateNewLogin, generateNewLoginKeys } from "@/Utils/Login";

import { NewUserState } from ".";

export function Profile() {
  const system = useContext(SnortContext);
  const [keys, setNewKeys] = useState<{ entropy: Uint8Array; privateKey: string }>();
  const [picture, setPicture] = useState<string>();
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as NewUserState;

  useEffect(() => {
    generateNewLoginKeys().then(setNewKeys);
  }, []);

  async function loginNewKeys() {
    try {
      if (!keys) return;
      setError("");
      await generateNewLogin(keys, system, key => Promise.resolve(new NotEncrypted(key)), {
        name: state.name,
        picture,
      });
      trackEvent("Login", { newAccount: true });
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
        <FormattedMessage defaultMessage="Profile Image" />
      </h1>
      <AvatarEditor picture={picture} onPictureChange={p => setPicture(p)} privKey={keys?.privateKey} />
      <AsyncButton className="primary" onClick={() => loginNewKeys()}>
        <FormattedMessage defaultMessage="Next" />
      </AsyncButton>
      {error && <b className="error">{error}</b>}
    </div>
  );
}
