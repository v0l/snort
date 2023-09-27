import "./LoginPage.css";

import { CSSProperties, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIntl, FormattedMessage } from "react-intl";
import { HexKey, Nip46Signer, PinEncrypted, PrivateKeySigner } from "@snort/system";

import { bech32ToHex, getPublicKey, unwrap } from "SnortUtils";
import ZapButton from "Element/ZapButton";
import useImgProxy from "Hooks/useImgProxy";
import Icon from "Icons/Icon";
import { generateNewLogin, LoginSessionType, LoginStore } from "Login";
import AsyncButton from "Element/AsyncButton";
import useLoginHandler, { PinRequiredError } from "Hooks/useLoginHandler";
import { secp256k1 } from "@noble/curves/secp256k1";
import { bytesToHex } from "@noble/curves/abstract/utils";
import Modal from "Element/Modal";
import QrCode from "Element/QrCode";
import Copy from "Element/Copy";
import { delay } from "SnortUtils";
import { PinPrompt } from "Element/PinPrompt";

declare global {
  interface Window {
    plausible?: (tag: string) => void;
  }
}

interface ArtworkEntry {
  name: string;
  pubkey: HexKey;
  link: string;
}

const KarnageKey = bech32ToHex("npub1r0rs5q2gk0e3dk3nlc7gnu378ec6cnlenqp8a3cjhyzu6f8k5sgs4sq9ac");

// todo: fill more
const Artwork: Array<ArtworkEntry> = [
  {
    name: "",
    pubkey: KarnageKey,
    link: "https://void.cat/d/VKhPayp9ekeXYZGzAL9CxP",
  },
  {
    name: "",
    pubkey: KarnageKey,
    link: "https://void.cat/d/3H2h8xxc3aEN6EVeobd8tw",
  },
  {
    name: "",
    pubkey: KarnageKey,
    link: "https://void.cat/d/7i9W9PXn3TV86C4RUefNC9",
  },
  {
    name: "",
    pubkey: KarnageKey,
    link: "https://void.cat/d/KtoX4ei6RYHY7HESg3Ve3k",
  },
];

export async function getNip05PubKey(addr: string): Promise<string> {
  const [username, domain] = addr.split("@");
  const rsp = await fetch(
    `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(username.toLocaleLowerCase())}`,
  );
  if (rsp.ok) {
    const data = await rsp.json();
    const pKey = data.names[username.toLowerCase()];
    if (pKey) {
      return pKey;
    }
  }
  throw new Error("User key not found");
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [key, setKey] = useState("");
  const [nip46Key, setNip46Key] = useState("");
  const [error, setError] = useState("");
  const [pin, setPin] = useState(false);
  const [art, setArt] = useState<ArtworkEntry>();
  const [isMasking, setMasking] = useState(true);
  const { formatMessage } = useIntl();
  const { proxy } = useImgProxy();
  const loginHandler = useLoginHandler();
  const hasNip7 = "nostr" in window;
  const hasSubtleCrypto = window.crypto.subtle !== undefined;
  const [nostrConnect, setNostrConnect] = useState("");

  useEffect(() => {
    const ret = unwrap(Artwork.at(Artwork.length * Math.random()));
    const url = proxy(ret.link);
    setArt({ ...ret, link: url });
  }, []);

  async function doLogin(pin?: string) {
    setError("");
    try {
      await loginHandler.doLogin(key, pin);
      navigate("/");
    } catch (e) {
      if (e instanceof PinRequiredError) {
        setPin(true);
        return;
      }
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

  async function makeRandomKey(pin: string) {
    try {
      await generateNewLogin(pin);
      window.plausible?.("Generate Account");
      navigate("/new");
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      }
    }
  }

  async function doNip07Login() {
    const relays =
      "getRelays" in unwrap(window.nostr) ? await unwrap(window.nostr?.getRelays).call(window.nostr) : undefined;
    const pubKey = await unwrap(window.nostr).getPublicKey();
    LoginStore.loginWithPubkey(pubKey, LoginSessionType.Nip7, relays);
    navigate("/");
  }

  function generateNip46() {
    const meta = {
      name: "Snort",
      url: window.location.href,
    };

    const newKey = bytesToHex(secp256k1.utils.randomPrivateKey());
    const relays = ["wss://relay.damus.io"].map(a => `relay=${encodeURIComponent(a)}`);
    const connectUrl = `nostrconnect://${getPublicKey(newKey)}?${[
      ...relays,
      `metadata=${encodeURIComponent(JSON.stringify(meta))}`,
    ].join("&")}`;
    setNostrConnect(connectUrl);
    setNip46Key(newKey);
  }

  async function startNip46(pin: string) {
    if (!nostrConnect || !nip46Key) return;

    const signer = new Nip46Signer(nostrConnect, new PrivateKeySigner(nip46Key));
    await signer.init();
    await delay(500);
    await signer.describe();
    LoginStore.loginWithPubkey(
      await signer.getPubKey(),
      LoginSessionType.Nip46,
      undefined,
      ["wss://relay.damus.io"],
      await PinEncrypted.create(nip46Key, pin),
    );
    navigate("/");
  }

  function nip46Buttons() {
    return (
      <>
        <AsyncButton
          type="button"
          onClick={() => {
            generateNip46();
            setPin(true);
          }}>
          <FormattedMessage defaultMessage="Nostr Connect" description="Login button for NIP-46 signer app" />
        </AsyncButton>
        {nostrConnect && !pin && (
          <Modal id="nostr-connect" onClose={() => setNostrConnect("")}>
            <>
              <h2>
                <FormattedMessage defaultMessage="Nostr Connect" />
              </h2>
              <p>
                <FormattedMessage defaultMessage="Scan this QR code with your signer app to get started" />
              </p>
              <div className="flex-column f-center g12">
                <QrCode data={nostrConnect} />
                <Copy text={nostrConnect} />
              </div>
            </>
          </Modal>
        )}
      </>
    );
  }

  function altLogins() {
    if (!hasNip7) {
      return;
    }

    return (
      <>
        <AsyncButton type="button" onClick={doNip07Login}>
          <FormattedMessage
            defaultMessage="Nostr Extension"
            description="Login button for NIP7 key manager extension"
          />
        </AsyncButton>
        {nip46Buttons()}
      </>
    );
  }

  function installExtension() {
    if (hasSubtleCrypto) return;

    return (
      <>
        <div className="flex login-or">
          <FormattedMessage defaultMessage="OR" description="Seperator text for Login / Generate Key" />
          <div className="divider w-max"></div>
        </div>
        <h1 dir="auto">
          <FormattedMessage
            defaultMessage="Install Extension"
            description="Heading for install key manager extension"
          />
        </h1>
        <p>
          <FormattedMessage defaultMessage="Key manager extensions are more secure and allow you to easily login to any Nostr client, here are some well known extensions:" />
        </p>
        <ul>
          <li>
            <a href="https://getalby.com/" target="_blank" rel="noreferrer">
              Alby
            </a>
          </li>
          <li>
            <a
              href="https://chrome.google.com/webstore/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp"
              target="_blank"
              rel="noreferrer">
              nos2x
            </a>
          </li>
        </ul>
        <p>
          <FormattedMessage
            defaultMessage="If you want to try out some others, check out {link} for more!"
            values={{
              link: <a href="https://github.com/aljazceru/awesome-nostr#browser-extensions">awesome-nostr</a>,
            }}
          />
        </p>
        <p>
          <FormattedMessage defaultMessage="Once you setup your key manager extension and generated a key, you can follow our new users flow to setup your profile and help you find some interesting people on Nostr to follow." />
        </p>
        {hasNip7 ? (
          <div className="login-actions">
            <button type="button" onClick={() => doNip07Login().then(() => navigate("/new/username"))}>
              <FormattedMessage defaultMessage="Setup Profile" />
            </button>
          </div>
        ) : (
          <b className="error">
            <FormattedMessage defaultMessage="Hmm, can't find a key manager extension.. try reloading the page." />
          </b>
        )}
      </>
    );
  }

  return (
    <div className="login">
      <div>
        <div className="login-container">
          <h1 className="logo" onClick={() => navigate("/")}>
            {process.env.APP_NAME}
          </h1>
          <h1 dir="auto">
            <FormattedMessage defaultMessage="Login" description="Login header" />
          </h1>
          <p dir="auto">
            <FormattedMessage defaultMessage="Your key" description="Label for key input" />
          </p>
          <div className="flex f-center g8">
            <input
              dir="auto"
              type={isMasking ? "password" : "text"}
              placeholder={formatMessage({
                defaultMessage: "nsec, npub, nip-05, hex, mnemonic",
              })}
              className="f-grow"
              onChange={e => setKey(e.target.value)}
            />
            <Icon
              name={isMasking ? "openeye" : "closedeye"}
              size={30}
              className="highlight pointer"
              onClick={() => setMasking(!isMasking)}
            />
          </div>
          {error.length > 0 ? <b className="error">{error}</b> : null}
          <p>
            <FormattedMessage
              defaultMessage="Only the secret key can be used to publish (sign events), everything else logs you in read-only mode."
              description="Explanation for public key only login is read-only"
            />
          </p>
          <div dir="auto" className="login-actions">
            <AsyncButton type="button" onClick={() => doLogin()}>
              <FormattedMessage defaultMessage="Login" description="Login button" />
            </AsyncButton>
            <AsyncButton onClick={() => setPin(true)}>
              <FormattedMessage defaultMessage="Create Account" />
            </AsyncButton>
            {pin && (
              <PinPrompt
                subTitle={
                  <p>
                    <FormattedMessage defaultMessage="Enter a pin to encrypt your private key, you must enter this pin every time you open Snort." />
                  </p>
                }
                onResult={async pin => {
                  setPin(false);
                  if (key) {
                    await doLogin(pin);
                  } else if (nostrConnect) {
                    await startNip46(pin);
                  } else {
                    await makeRandomKey(pin);
                  }
                }}
                onCancel={() => setPin(false)}
              />
            )}
            {altLogins()}
          </div>
          {installExtension()}
        </div>
      </div>
      <div>
        <div className="artwork" style={{ ["--img-src"]: `url('${art?.link}')` } as CSSProperties}>
          <div className="attribution">
            <FormattedMessage
              defaultMessage="Art by {name}"
              description="Artwork attribution label"
              values={{
                name: <span className="artist">Karnage</span>,
              }}
            />
            <ZapButton pubkey={art?.pubkey ?? ""} />
          </div>
        </div>
      </div>
    </div>
  );
}
