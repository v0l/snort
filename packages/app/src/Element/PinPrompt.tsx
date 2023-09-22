import useLogin from "Hooks/useLogin";
import "./PinPrompt.css";
import { ReactNode, useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import useEventPublisher from "Hooks/useEventPublisher";
import { LoginStore, createPublisher, sessionNeedsPin } from "Login";
import { unwrap } from "@snort/shared";
import { EventPublisher, InvalidPinError, PinEncrypted, PinEncryptedPayload } from "@snort/system";
import { DefaultPowWorker } from "index";
import Modal from "./Modal";

const PinLen = 6;
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

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isNaN(Number(e.key)) && pin.length < PinLen) {
      setPin(s => (s += e.key));
    }
    if (e.key === "Backspace") {
      setPin(s => s.slice(0, -1));
    } else {
      e.preventDefault();
    }
  };

  useEffect(() => {
    if (pin.length > 0) {
      setError("");
    }

    if (pin.length === PinLen) {
      onResult(pin).catch(e => {
        console.error(e);
        setPin("");
        if (e instanceof InvalidPinError) {
          setError(
            formatMessage({
              defaultMessage: "Incorrect pin",
            }),
          );
        } else if (e instanceof Error) {
          setError(e.message);
        }
      });
    }
  }, [pin]);

  return (
    <Modal id="pin" onClose={() => onCancel()}>
      <div className="flex-column g12">
        <h2>
          <FormattedMessage defaultMessage="Enter Pin" />
        </h2>
        {subTitle}
        <input type="number" onKeyDown={handleKey} value={pin} autoFocus={true} maxLength={PinLen} />
        {error && <b className="error">{error}</b>}
        <div>
          <button type="button" onClick={() => onCancel()}>
            <FormattedMessage defaultMessage="Cancel" />
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function LoginUnlock() {
  const login = useLogin();
  const publisher = useEventPublisher();

  async function encryptMigration(pin: string) {
    const k = unwrap(login.privateKey);
    const newPin = await PinEncrypted.create(k, pin);

    const pub = EventPublisher.privateKey(k);
    if (login.preferences.pow) {
      pub.pow(login.preferences.pow, DefaultPowWorker);
    }
    LoginStore.setPublisher(login.id, pub);
    LoginStore.updateSession({
      ...login,
      privateKeyData: newPin,
      privateKey: undefined,
    });
  }

  async function unlockSession(pin: string) {
    const key = new PinEncrypted(unwrap(login.privateKeyData) as PinEncryptedPayload);
    await key.decrypt(pin);
    const pub = createPublisher(login, key);
    if (pub) {
      if (login.preferences.pow) {
        pub.pow(login.preferences.pow, DefaultPowWorker);
      }
      LoginStore.setPublisher(login.id, pub);
      LoginStore.updateSession({
        ...login,
        privateKeyData: key,
      });
    }
  }

  if (login.publicKey && !publisher && sessionNeedsPin(login)) {
    if (login.privateKey !== undefined) {
      return (
        <PinPrompt
          subTitle={
            <p>
              <FormattedMessage defaultMessage="Enter a pin to encrypt your private key, you must enter this pin every time you open Snort." />
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
            <FormattedMessage defaultMessage="Enter pin to unlock your private key" />
          </p>
        }
        onResult={unlockSession}
        onCancel={() => {
          //nothing
        }}
      />
    );
  }
}
