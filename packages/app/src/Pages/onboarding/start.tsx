import { FormattedMessage, useIntl } from "react-intl";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { unwrap } from "@snort/shared";

import AsyncButton from "@/Element/AsyncButton";
import Icon from "@/Icons/Icon";
import { NewUserState } from ".";
import { LoginSessionType, LoginStore } from "@/Login";
import useLoginHandler from "@/Hooks/useLoginHandler";
import { NotEncrypted } from "@snort/system";
import classNames from "classnames";
import { trackEvent } from "@/SnortUtils";

export function SignIn() {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [useKey, setUseKey] = useState(false);
  const loginHandler = useLoginHandler();

  const hasNip7 = "nostr" in window;
  async function doNip07Login() {
    /*const relays =
      "getRelays" in unwrap(window.nostr) ? await unwrap(window.nostr?.getRelays).call(window.nostr) : undefined;*/
    const pubKey = await unwrap(window.nostr).getPublicKey();
    LoginStore.loginWithPubkey(pubKey, LoginSessionType.Nip7);
    trackEvent("Login:NIP7");
    navigate("/");
  }

  async function doLogin() {
    setError("");
    try {
      await loginHandler.doLogin(key, key => Promise.resolve(new NotEncrypted(key)));

      trackEvent("Login:Key");
      navigate("/");
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError(
          formatMessage({
            defaultMessage: "Unknown login error",
            id: "OLEm6z",
          }),
        );
      }
      console.error(e);
    }
  }

  const nip7Login = hasNip7 && !useKey;
  return (
    <div className="flex flex-col g24">
      <img src={CONFIG.appleTouchIconUrl} width={48} height={48} className="br mr-auto ml-auto" />
      <div className="flex flex-col g16 items-center">
        <h1>
          <FormattedMessage defaultMessage="Sign In" id="Ub+AGc" />
        </h1>
        {nip7Login && <FormattedMessage defaultMessage="Use a nostr signer extension to sign in" id="eF0Re7" />}
      </div>
      <div className={classNames("flex flex-col g16", { "items-center": nip7Login })}>
        {hasNip7 && !useKey && (
          <>
            <AsyncButton onClick={doNip07Login}>
              <div className="circle bg-warning p12 text-white">
                <Icon name="key" />
              </div>
              <FormattedMessage defaultMessage="Sign in with Nostr Extension" id="TaeBqw" />
            </AsyncButton>
            <Link to="" className="highlight">
              <FormattedMessage defaultMessage="Supported Extensions" id="aMaLBK" />
            </Link>
            <AsyncButton onClick={() => setUseKey(true)}>
              <FormattedMessage defaultMessage="Sign in with key" id="X6tipZ" />
            </AsyncButton>
          </>
        )}
        {(!hasNip7 || useKey) && (
          <>
            <input
              type="text"
              placeholder={formatMessage({
                defaultMessage: "nsec, npub, nip-05, hex, mnemonic",
                id: "X7xU8J",
              })}
              value={key}
              onChange={e => setKey(e.target.value)}
              className="new-username"
            />
            {error && <b className="error">{error}</b>}
            <AsyncButton onClick={doLogin} className="primary">
              <FormattedMessage defaultMessage="Login" id="AyGauy" />
            </AsyncButton>
          </>
        )}
      </div>
      <div className="flex flex-col g16 items-center">
        <FormattedMessage defaultMessage="Don't have an account?" id="25WwxF" />
        <AsyncButton className="secondary" onClick={() => navigate("/login/sign-up")}>
          <FormattedMessage defaultMessage="Sign Up" id="39AHJm" />
        </AsyncButton>
      </div>
    </div>
  );
}

export function SignUp() {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const [name, setName] = useState("");

  return (
    <div className="flex flex-col g24">
      <img src={CONFIG.appleTouchIconUrl} width={48} height={48} className="br mr-auto ml-auto" />
      <div className="flex flex-col g16 items-center">
        <h1>
          <FormattedMessage defaultMessage="Sign Up" id="39AHJm" />
        </h1>
        <FormattedMessage defaultMessage="What should we call you?" id="SmuYUd" />
      </div>
      <div className="flex flex-col g16">
        <input
          type="text"
          autoFocus={true}
          placeholder={formatMessage({
            defaultMessage: "Name or nym",
            id: "aHje0o",
          })}
          value={name}
          onChange={e => setName(e.target.value)}
          className="new-username"
        />
        <AsyncButton
          className="primary"
          disabled={name.length === 0}
          onClick={() =>
            navigate("/login/sign-up/profile", {
              state: {
                name: name,
              } as NewUserState,
            })
          }>
          <FormattedMessage defaultMessage="Next" id="9+Ddtu" />
        </AsyncButton>
      </div>
      <div className="flex flex-col g16 items-center">
        <FormattedMessage defaultMessage="Already have an account?" id="uCk8r+" />
        <AsyncButton className="secondary" onClick={() => navigate("/login")}>
          <FormattedMessage defaultMessage="Sign In" id="Ub+AGc" />
        </AsyncButton>
      </div>
    </div>
  );
}
