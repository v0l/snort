import useLogin from "@/Hooks/useLogin";
import "./PinPrompt.css";
import { ReactNode, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { unwrap } from "@snort/shared";
import { EventPublisher, InvalidPinError, PinEncrypted } from "@snort/system";

import useEventPublisher from "@/Hooks/useEventPublisher";
import { LoginStore, createPublisher, sessionNeedsPin } from "@/Login";
import Modal from "./Modal";
import AsyncButton from "./AsyncButton";
import { GetPowWorker } from "@/index";

export function PinPrompt({
  onResult,
  onCancel,
  subTitle,
}: {
  onResult: (v: string) => Promise<void>;
  onCancel: () => void;
  subTitle?: ReactNode;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const { formatMessage } = useIntl();
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  async function submitPin() {
    if (pin.length < 4) {
      setError(
        formatMessage({
          defaultMessage: "Pin too short", id: 'LR1XjT',
        }),
      );
      return;
    }
    setError("");

    try {
      await onResult(pin);
    } catch (e) {
      console.error(e);
      if (e instanceof InvalidPinError) {
        setError(
          formatMessage({
            defaultMessage: "Incorrect pin", id: 'qz9fty',
          }),
        );
      } else if (e instanceof Error) {
        setError(e.message);
      }
    } finally {
      setPin("");
    }
  }

  return (
    <Modal id="pin" onClose={() => onCancel()}>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (submitButtonRef.current) {
            submitButtonRef.current.click();
          }
        }}>
        <div className="flex flex-col g12">
          <h2>
            <FormattedMessage defaultMessage="Enter Pin" id="KtsyO0" />
          </h2>
          {subTitle ? <div>{subTitle}</div> : null}
          <input
            type="number"
            onChange={e => setPin(e.target.value)}
            value={pin}
            autoFocus={true}
            maxLength={20}
            minLength={4}
          />
          {error && <b className="error">{error}</b>}
          <div className="flex g8">
            <button type="button" onClick={() => onCancel()}>
              <FormattedMessage defaultMessage="Cancel" id="47FYwb" />
            </button>
            <AsyncButton ref={submitButtonRef} onClick={() => submitPin()} type="submit">
              <FormattedMessage defaultMessage="Submit" id="wSZR47" />
            </AsyncButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function LoginUnlock() {
  const login = useLogin();
  const { publisher } = useEventPublisher();

  async function encryptMigration(pin: string) {
    const k = unwrap(login.privateKey);
    const newPin = await PinEncrypted.create(k, pin);

    const pub = EventPublisher.privateKey(k);
    if (login.appData.item.preferences.pow) {
      pub.pow(login.appData.item.preferences.pow, GetPowWorker());
    }
    LoginStore.setPublisher(login.id, pub);
    LoginStore.updateSession({
      ...login,
      readonly: false,
      privateKeyData: newPin,
      privateKey: undefined,
    });
  }

  async function unlockSession(pin: string) {
    const key = unwrap(login.privateKeyData);
    await key.unlock(pin);
    const pub = createPublisher(login);
    if (pub) {
      if (login.appData.item.preferences.pow) {
        pub.pow(login.appData.item.preferences.pow, GetPowWorker());
      }
      LoginStore.setPublisher(login.id, pub);
      LoginStore.updateSession({
        ...login,
        readonly: false,
        privateKeyData: key,
      });
    }
  }

  function makeSessionReadonly() {
    LoginStore.updateSession({
      ...login,
      readonly: true,
    });
  }

  if (login.publicKey && !publisher && sessionNeedsPin(login) && !login.readonly) {
    if (login.privateKey !== undefined) {
      return (
        <PinPrompt
          subTitle={
            <p>
              <FormattedMessage
                defaultMessage="Enter a pin to encrypt your private key, you must enter this pin every time you open {site}." id="SLZGPn"
                values={{
                  site: CONFIG.appNameCapitalized,
                }}
              />
            </p>
          }
          onResult={encryptMigration}
          onCancel={() => {
            // nothing
          }}
        />
      );
    }
    return (
      <PinPrompt
        subTitle={
          <p>
            <FormattedMessage defaultMessage="Enter pin to unlock your private key" id="e7VmYP" />
          </p>
        }
        onResult={unlockSession}
        onCancel={() => {
          makeSessionReadonly();
        }}
      />
    );
  }
}
