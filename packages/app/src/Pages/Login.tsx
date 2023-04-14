import "./Login.css";

import { CSSProperties, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as secp from "@noble/secp256k1";
import { useIntl, FormattedMessage } from "react-intl";
import { HexKey } from "@snort/nostr";

import { EmailRegex, MnemonicRegex } from "Const";
import { bech32ToHex, unwrap } from "Util";
import { generateBip39Entropy, entropyToDerivedKey } from "nip6";
import ZapButton from "Element/ZapButton";
import useImgProxy from "Hooks/useImgProxy";
import Icon from "Icons/Icon";
import useLogin from "Hooks/useLogin";
import { generateNewLogin, LoginStore } from "Login";
import useEventPublisher from "Feed/EventPublisher";
import AsyncButton from "Element/AsyncButton";

import messages from "./messages";

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
    `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(username.toLocaleLowerCase())}`
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
  const publisher = useEventPublisher();
  const login = useLogin();
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [art, setArt] = useState<ArtworkEntry>();
  const [isMasking, setMasking] = useState(true);
  const { formatMessage } = useIntl();
  const { proxy } = useImgProxy();
  const hasNip7 = "nostr" in window;
  const hasSubtleCrypto = window.crypto.subtle !== undefined;

  useEffect(() => {
    if (login.publicKey) {
      navigate("/");
    }
  }, [login, navigate]);

  useEffect(() => {
    const ret = unwrap(Artwork.at(Artwork.length * Math.random()));
    proxy(ret.link).then(a => setArt({ ...ret, link: a }));
  }, []);

  async function doLogin() {
    const insecureMsg = formatMessage({
      defaultMessage:
        "Can't login with private key on an insecure connection, please use a Nostr key manager extension instead",
    });
    try {
      if (key.startsWith("nsec")) {
        if (!hasSubtleCrypto) {
          throw new Error(insecureMsg);
        }
        const hexKey = bech32ToHex(key);
        if (secp.utils.isValidPrivateKey(hexKey)) {
          LoginStore.loginWithPrivateKey(hexKey);
        } else {
          throw new Error("INVALID PRIVATE KEY");
        }
      } else if (key.startsWith("npub")) {
        const hexKey = bech32ToHex(key);
        LoginStore.loginWithPubkey(hexKey);
      } else if (key.match(EmailRegex)) {
        const hexKey = await getNip05PubKey(key);
        LoginStore.loginWithPubkey(hexKey);
      } else if (key.match(MnemonicRegex)) {
        if (!hasSubtleCrypto) {
          throw new Error(insecureMsg);
        }
        const ent = generateBip39Entropy(key);
        const keyHex = entropyToDerivedKey(ent);
        LoginStore.loginWithPrivateKey(keyHex);
      } else if (secp.utils.isValidPrivateKey(key)) {
        if (!hasSubtleCrypto) {
          throw new Error(insecureMsg);
        }
        LoginStore.loginWithPrivateKey(key);
      } else {
        throw new Error("INVALID PRIVATE KEY");
      }
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError(
          formatMessage({
            defaultMessage: "Unknown login error",
          })
        );
      }
      console.error(e);
    }
  }

  async function makeRandomKey() {
    await generateNewLogin(publisher);
    navigate("/new");
  }

  async function doNip07Login() {
    const relays = "getRelays" in window.nostr ? await window.nostr.getRelays() : undefined;
    const pubKey = await window.nostr.getPublicKey();
    LoginStore.loginWithPubkey(pubKey, relays);
  }

  function altLogins() {
    if (!hasNip7) {
      return;
    }

    return (
      <button type="button" onClick={doNip07Login}>
        <FormattedMessage
          defaultMessage="Login with Extension (NIP-07)"
          description="Login button for NIP7 key manager extension"
        />
      </button>
    );
  }

  function generateKey() {
    if (!hasSubtleCrypto) return;

    return (
      <>
        <div className="flex login-or">
          <FormattedMessage defaultMessage="OR" description="Seperator text for Login / Generate Key" />
          <div className="divider w-max"></div>
        </div>
        <h1 dir="auto">
          <FormattedMessage defaultMessage="Create an Account" description="Heading for generate key flow" />
        </h1>
        <p>
          <FormattedMessage
            defaultMessage="Generate a public / private key pair. Do not share your private key with anyone, this acts as your password. Once lost, it cannot be “reset” or recovered. Keep safe!"
            description="Note about key security before generating a new key"
          />
        </p>
        <div className="login-actions">
          <AsyncButton onClick={() => makeRandomKey()}>
            <FormattedMessage defaultMessage="Generate Key" description="Button: Generate a new key" />
          </AsyncButton>
        </div>
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
          <div className="logo" onClick={() => navigate("/")}>
            Snort
          </div>
          <h1 dir="auto">
            <FormattedMessage defaultMessage="Login" description="Login header" />
          </h1>
          <p dir="auto">
            <FormattedMessage defaultMessage="Your key" description="Label for key input" />
          </p>
          <div className="flex">
            <input
              dir="auto"
              type={isMasking ? "password" : "text"}
              placeholder={formatMessage(messages.KeyPlaceholder)}
              className="f-grow"
              onChange={e => setKey(e.target.value)}
            />
            <Icon
              name={isMasking ? "openeye" : "closedeye"}
              size={30}
              className="highlight btn-sm pointer"
              onClick={() => setMasking(!isMasking)}
            />
          </div>
          {error.length > 0 ? <b className="error">{error}</b> : null}
          <p className="login-note">
            <FormattedMessage
              defaultMessage="Only the secret key can be used to publish (sign events), everything else logs you in read-only mode."
              description="Explanation for public key only login is read-only"
            />
          </p>
          <div dir="auto" className="login-actions">
            <button type="button" onClick={doLogin}>
              <FormattedMessage defaultMessage="Login" description="Login button" />
            </button>
            {altLogins()}
          </div>
          {generateKey()}
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
