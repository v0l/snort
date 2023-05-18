import "./LoginPage.css";

import { CSSProperties, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIntl, FormattedMessage } from "react-intl";
import { HexKey } from "@snort/nostr";

import { bech32ToHex, unwrap } from "Util";
import ZapButton from "Element/ZapButton";
import useImgProxy from "Hooks/useImgProxy";
import Icon from "Icons/Icon";
import useLogin from "Hooks/useLogin";
import { generateNewLogin, LoginStore } from "Login";
import AsyncButton from "Element/AsyncButton";
import useLoginHandler from "Hooks/useLoginHandler";

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
  const login = useLogin();
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [art, setArt] = useState<ArtworkEntry>();
  const [isMasking, setMasking] = useState(true);
  const { formatMessage } = useIntl();
  const { proxy } = useImgProxy();
  const loginHandler = useLoginHandler();
  const hasNip7 = "nostr" in window;
  const hasSubtleCrypto = window.crypto.subtle !== undefined;

  useEffect(() => {
    if (login.publicKey) {
      navigate("/");
    }
  }, [login, navigate]);

  useEffect(() => {
    const ret = unwrap(Artwork.at(Artwork.length * Math.random()));
    const url = proxy(ret.link);
    setArt({ ...ret, link: url });
  }, []);

  async function doLogin() {
    try {
      await loginHandler.doLogin(key);
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
    await generateNewLogin();
    navigate("/new");
  }

  async function doNip07Login() {
    const relays =
      "getRelays" in unwrap(window.nostr) ? await unwrap(window.nostr?.getRelays).call(window.nostr) : undefined;
    const pubKey = await unwrap(window.nostr).getPublicKey();
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
            Snort
          </h1>
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
              placeholder={formatMessage({
                defaultMessage: "nsec, npub, nip-05, hex, mnemonic",
              })}
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
          <p>
            <FormattedMessage
              defaultMessage="Only the secret key can be used to publish (sign events), everything else logs you in read-only mode."
              description="Explanation for public key only login is read-only"
            />
          </p>
          <div dir="auto" className="login-actions">
            <button type="button" onClick={doLogin}>
              <FormattedMessage defaultMessage="Login" description="Login button" />
            </button>
            <AsyncButton onClick={() => makeRandomKey()}>
              <FormattedMessage defaultMessage="Create Account" />
            </AsyncButton>
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
