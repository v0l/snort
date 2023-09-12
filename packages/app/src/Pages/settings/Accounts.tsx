import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import ProfilePreview from "Element/ProfilePreview";
import { LoginStore } from "Login";
import useLoginHandler from "Hooks/useLoginHandler";
import AsyncButton from "Element/AsyncButton";
import { getActiveSubscriptions } from "Subscription";

export default function AccountsPage() {
  const { formatMessage } = useIntl();
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const loginHandler = useLoginHandler();
  const logins = LoginStore.getSessions();
  const sub = getActiveSubscriptions(LoginStore.allSubscriptions());

  async function doLogin() {
    try {
      setError("");
      await loginHandler.doLogin(key);
      setKey("");
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError(
          formatMessage({
            defaultMessage: "Unknown login error",
          }),
        );
      }
      console.error(e);
    }
  }

  return (
    <>
      <h3>
        <FormattedMessage defaultMessage="Logins" />
      </h3>
      {logins.map(a => (
        <div className="card flex" key={a}>
          <ProfilePreview
            pubkey={a}
            options={{
              about: false,
            }}
            actions={
              <div className="f-1">
                <button className="mb10" onClick={() => LoginStore.switchAccount(a)}>
                  <FormattedMessage defaultMessage="Switch" />
                </button>
                <button onClick={() => LoginStore.removeSession(a)}>
                  <FormattedMessage defaultMessage="Logout" />
                </button>
              </div>
            }
          />
        </div>
      ))}

      {sub && (
        <>
          <h3>
            <FormattedMessage defaultMessage="Add Account" />
          </h3>
          <div className="flex">
            <input
              dir="auto"
              type="text"
              placeholder={formatMessage({
                defaultMessage: "nsec, npub, nip-05, hex, mnemonic",
              })}
              className="f-grow mr10"
              onChange={e => setKey(e.target.value)}
            />
            <AsyncButton onClick={() => doLogin()}>
              <FormattedMessage defaultMessage="Login" />
            </AsyncButton>
          </div>
        </>
      )}
      {error && <b className="error">{error}</b>}
    </>
  );
}
