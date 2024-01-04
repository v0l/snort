import { unwrap } from "@snort/shared";
import { NotEncrypted } from "@snort/system";
import classNames from "classnames";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Link, useNavigate } from "react-router-dom";

import AsyncButton from "@/Components/Button/AsyncButton";
import Icon from "@/Components/Icons/Icon";
import useLoginHandler from "@/Hooks/useLoginHandler";
import { trackEvent } from "@/Utils";
import { LoginSessionType, LoginStore } from "@/Utils/Login";

import { NewUserState } from ".";

const NSEC_NPUB_REGEX = /(nsec1|npub1)[a-zA-Z0-9]{20,65}/gi;

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
    trackEvent("Login", { type: "NIP7" });
    navigate("/");
  }

  async function onSubmit(e) {
    e.preventDefault();
    doLogin(key);
  }

  async function doLogin(key: string) {
    setError("");
    try {
      await loginHandler.doLogin(key, key => Promise.resolve(new NotEncrypted(key)));
      trackEvent("Login", { type: "Key" });
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

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.match(NSEC_NPUB_REGEX)) {
      doLogin(val);
    } else {
      setKey(val);
    }
  };

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
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder={formatMessage({
                defaultMessage: "nsec, npub, nip-05, hex, mnemonic",
                id: "X7xU8J",
              })}
              value={key}
              onChange={onChange} // TODO should log in directly if nsec or npub is pasted
              className="new-username"
            />
            {error && <b className="error">{error}</b>}
            <div className="flex justify-center">
              <AsyncButton onClick={onSubmit} className="primary">
                <FormattedMessage defaultMessage="Login" id="AyGauy" />
              </AsyncButton>
            </div>
          </form>
        )}
      </div>
      <div className="flex flex-col g16 items-center">
        <Link to={"/login/sign-up"}>
          <FormattedMessage defaultMessage="Don't have an account?" id="25WwxF" />
        </Link>
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

  const onSubmit = () => {
    navigate("/login/sign-up/profile", {
      state: {
        name: name,
      } as NewUserState,
    });
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.match(NSEC_NPUB_REGEX)) {
      e.preventDefault();
    } else {
      setName(val);
    }
  };

  return (
    <div className="flex flex-col g24">
      <img src={CONFIG.appleTouchIconUrl} width={48} height={48} className="br mr-auto ml-auto" />
      <div className="flex flex-col g16 items-center">
        <h1>
          <FormattedMessage defaultMessage="Sign Up" id="39AHJm" />
        </h1>
        <FormattedMessage defaultMessage="What should we call you?" id="SmuYUd" />
      </div>
      <form onSubmit={onSubmit} className="flex flex-col g16">
        <input
          type="text"
          autoFocus={true}
          placeholder={formatMessage({
            defaultMessage: "Name or nym",
            id: "aHje0o",
          })}
          value={name}
          onChange={onChange}
          className="new-username"
        />
        <AsyncButton className="primary" disabled={name.length === 0} onClick={onSubmit}>
          <FormattedMessage defaultMessage="Next" id="9+Ddtu" />
        </AsyncButton>
      </form>
      <div className="flex flex-col g16 items-center">
        <Link to={"/login"}>
          <FormattedMessage defaultMessage="Already have an account?" id="uCk8r+" />
        </Link>
        <AsyncButton className="secondary" onClick={() => navigate("/login")}>
          <FormattedMessage defaultMessage="Sign In" id="Ub+AGc" />
        </AsyncButton>
      </div>
    </div>
  );
}
