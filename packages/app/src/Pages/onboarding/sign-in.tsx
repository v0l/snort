import { Nip7Signer, Nip55Signer, NotEncrypted } from "@snort/system";
import classNames from "classnames";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Link, useNavigate } from "react-router-dom";

import AsyncButton from "@/Components/Button/AsyncButton";
import Icon from "@/Components/Icons/Icon";
import useLoginHandler from "@/Hooks/useLoginHandler";
import { trackEvent } from "@/Utils";
import { LoginSessionType, LoginStore } from "@/Utils/Login";

import { Bech32Regex } from "@snort/shared";

const signer = new Nip55Signer();

export default function SignIn() {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [useKey, setUseKey] = useState(false);
  const loginHandler = useLoginHandler();

  const hasNip7 = "nostr" in window;
  const hasNip55 = true;

  async function doNip07Login() {
    const signer = new Nip7Signer();
    const pubKey = await signer.getPubKey();
    LoginStore.loginWithPubkey(pubKey, LoginSessionType.Nip7);
    trackEvent("Login", { type: "NIP7" });
    navigate("/");
  }

  async function doNip55Login() {
    const pubKey = await signer.getPubKey();
    LoginStore.loginWithPubkey(pubKey, LoginSessionType.Nip55);
    trackEvent("Login", { type: "NIP55" });
    navigate("/");
  }

  async function onSubmit(e: Event) {
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
    if (val.match(Bech32Regex)) {
      doLogin(val);
    } else {
      setKey(val);
    }
  };

  const signerExtLogin = (hasNip7 || hasNip55) && !useKey;
  return (
    <div className="flex flex-col gap-6">
      <img src={CONFIG.icon} width={48} height={48} className="rounded-lg mr-auto ml-auto" />
      <div className="flex flex-col gap-4 items-center">
        <h1>
          <FormattedMessage defaultMessage="Sign In" />
        </h1>
        {signerExtLogin && <FormattedMessage defaultMessage="Use a nostr signer extension to sign in" />}
      </div>
      <div className={classNames("flex flex-col gap-4", { "items-center": signerExtLogin })}>
        {signerExtLogin && (
          <>
            <AsyncButton onClick={doNip07Login}>
              <div className="circle bg-warning p-3 text-white">
                <Icon name="key" />
              </div>
              <FormattedMessage defaultMessage="Sign in with Nostr Extension" />
            </AsyncButton>
            <AsyncButton onClick={doNip55Login}>
              <div className="circle bg-warning p-3 text-white">
                <Icon name="key" />
              </div>
              <FormattedMessage defaultMessage="Sign in with Android signer" />
            </AsyncButton>
            <Link to="" className="highlight">
              <FormattedMessage defaultMessage="Supported Extensions" />
            </Link>
            <AsyncButton onClick={() => setUseKey(true)}>
              <FormattedMessage defaultMessage="Sign in with key" />
            </AsyncButton>
          </>
        )}
        {(!signerExtLogin || useKey) && (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder={formatMessage({
                defaultMessage: "nsec, npub, nip-05, hex, mnemonic",
              })}
              value={key}
              onChange={onChange}
              className="new-username"
            />
            {error && <b className="error">{error}</b>}
            <div className="flex justify-center">
              <AsyncButton onClick={onSubmit} className="primary">
                <FormattedMessage defaultMessage="Login" />
              </AsyncButton>
            </div>
          </form>
        )}
      </div>
      <div className="flex flex-col gap-4 items-center">
        <Link to={"/login/sign-up"}>
          <FormattedMessage defaultMessage="Don't have an account?" />
        </Link>
        <AsyncButton className="secondary" onClick={() => navigate("/login/sign-up")}>
          <FormattedMessage defaultMessage="Sign Up" />
        </AsyncButton>
      </div>
    </div>
  );
}
