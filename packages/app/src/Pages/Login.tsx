import "./Login.css";

import { CSSProperties, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import * as secp from "@noble/secp256k1";
import { useIntl, FormattedMessage } from "react-intl";
import { Connect, ConnectURI } from "@nostr-connect/connect";
import { generatePrivateKey } from "nostr-tools";

import { RootState } from "State/Store";
import { setPrivateKey, setPublicKey, setRelays, setGeneratedPrivateKey } from "State/Login";
import { DefaultRelays, EmailRegex } from "Const";
import { bech32ToHex, unwrap } from "Util";
import { HexKey } from "@snort/nostr";
import ZapButton from "Element/ZapButton";
// import useImgProxy from "Feed/ImgProxy";

import messages from "./messages";
import QRCode from "react-qr-code";
import Modal from "Element/Modal";

interface ArtworkEntry {
  name: string;
  pubkey: HexKey;
  link: string;
}

// todo: fill more
const Artwork: Array<ArtworkEntry> = [
  {
    name: "",
    pubkey: bech32ToHex("npub1r0rs5q2gk0e3dk3nlc7gnu378ec6cnlenqp8a3cjhyzu6f8k5sgs4sq9ac"),
    link: "https://void.cat/d/VKhPayp9ekeXYZGzAL9CxP",
  },
  {
    name: "",
    pubkey: bech32ToHex("npub1r0rs5q2gk0e3dk3nlc7gnu378ec6cnlenqp8a3cjhyzu6f8k5sgs4sq9ac"),
    link: "https://void.cat/d/3H2h8xxc3aEN6EVeobd8tw",
  },
  {
    name: "",
    pubkey: bech32ToHex("npub1r0rs5q2gk0e3dk3nlc7gnu378ec6cnlenqp8a3cjhyzu6f8k5sgs4sq9ac"),
    link: "https://void.cat/d/7i9W9PXn3TV86C4RUefNC9",
  },
  {
    name: "",
    pubkey: bech32ToHex("npub1r0rs5q2gk0e3dk3nlc7gnu378ec6cnlenqp8a3cjhyzu6f8k5sgs4sq9ac"),
    link: "https://void.cat/d/KtoX4ei6RYHY7HESg3Ve3k",
  },
];

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const publicKey = useSelector<RootState, HexKey | undefined>(s => s.login.publicKey);
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [art, setArt] = useState<ArtworkEntry>();
  const { formatMessage } = useIntl();
  //const { proxy } = useImgProxy();
  const [connectKey, setConnectKey] = useState<string | null>("");
  const [connectURI, setConnectURI] = useState<string | null>("");

  useEffect(() => {
    if (publicKey) {
      navigate("/");
    }

    (async () => {
      // Connect to Nostr
      if (connectKey) {
        const connect = new Connect({ secretKey: connectKey, relay: "wss://nostr.vulpem.com" });
        connect.events.on("connect", (pub: string) => {
          console.log("connected with wallet: " + pub);
          dispatch(setPublicKey(pub));
        });
        connect.events.on("disconnect", () => {
          setConnectKey(null);
        });
        await connect.init();
      }
    })();
  }, [publicKey, navigate, connectKey]);

  useEffect(() => {
    const ret = unwrap(Artwork.at(Artwork.length * Math.random()));
    // disable for now because imgproxy is ded
    // proxy(ret.link).then(a => setArt({ ...ret, link: a }));
    setArt(ret);
  }, []);

  async function getNip05PubKey(addr: string) {
    const [username, domain] = addr.split("@");
    const rsp = await fetch(`https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(username)}`);
    if (rsp.ok) {
      const data = await rsp.json();
      const pKey = data.names[username];
      if (pKey) {
        return pKey;
      }
    }
    throw new Error("User key not found");
  }

  async function doLogin() {
    try {
      if (key.startsWith("nsec")) {
        const hexKey = bech32ToHex(key);
        if (secp.utils.isValidPrivateKey(hexKey)) {
          dispatch(setPrivateKey(hexKey));
        } else {
          throw new Error("INVALID PRIVATE KEY");
        }
      } else if (key.startsWith("npub")) {
        const hexKey = bech32ToHex(key);
        dispatch(setPublicKey(hexKey));
      } else if (key.match(EmailRegex)) {
        const hexKey = await getNip05PubKey(key);
        dispatch(setPublicKey(hexKey));
      } else {
        if (secp.utils.isValidPrivateKey(key)) {
          dispatch(setPrivateKey(key));
        } else {
          throw new Error("INVALID PRIVATE KEY");
        }
      }
    } catch (e) {
      setError(`Failed to load NIP-05 pub key (${e})`);
      console.error(e);
    }
  }

  async function makeRandomKey() {
    const newKey = secp.utils.bytesToHex(secp.utils.randomPrivateKey());
    dispatch(setGeneratedPrivateKey(newKey));
    navigate("/new");
  }

  async function doNip07Login() {
    const pubKey = await window.nostr.getPublicKey();
    dispatch(setPublicKey(pubKey));

    if ("getRelays" in window.nostr) {
      const relays = await window.nostr.getRelays();
      dispatch(
        setRelays({
          relays: {
            ...relays,
            ...Object.fromEntries(DefaultRelays.entries()),
          },
          createdAt: 1,
        })
      );
    }
  }

  async function doNip46Connect() {
    let sk = connectKey;
    if (!sk) {
      sk = generatePrivateKey();
      setConnectKey(sk);
    }

    const connectURI = new ConnectURI({
      target: sk,
      relay: "wss://nostr.vulpem.com",
      metadata: {
        name: "Snort.Social",
        description: "Fast nostr web ui.",
        url: "https://snort.social",
        icons: ["https://snort.social/nostrich_512.png"],
      },
    });
    const uri = connectURI.toString();

    console.log(uri);
    setConnectURI(uri);
  }

  async function closeSession() {
    setConnectURI(null);
    setConnectKey(null);
  }

  function altLogins() {
    const nip07 = "nostr" in window;
    if (!nip07) {
      return null;
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
              type="text"
              placeholder={formatMessage(messages.KeyPlaceholder)}
              className="f-grow"
              onChange={e => setKey(e.target.value)}
            />
          </div>
          {error.length > 0 ? <b className="error">{error}</b> : null}
          <p className="login-note">
            <FormattedMessage
              defaultMessage="Only the secret key can be used to publish (sign events), everything else logs you in read-only mode."
              description="Explanation for public key only login is read-only"
            />
          </p>
          {/* <a href="">
            <FormattedMessage
              defaultMessage="Why is there no password field?"
              description="Link to why your private key is your password"
            />
          </a>*/}
          <div dir="auto" className="login-actions">
            <button type="button" onClick={doLogin}>
              <FormattedMessage defaultMessage="Login" description="Login button" />
            </button>

            {connectURI && !publicKey ? (
              <Modal className="note-creator-modal" onClose={closeSession}>
                <>
                  <p dir="auto">
                    <FormattedMessage
                      defaultMessage="Scan with a Nostr Connect app"
                      description="Scan with a Nostr Connect app"
                    />
                  </p>
                  <div className="flex" style={{ padding: "2px", backgroundColor: "white" }}>
                    <QRCode value={connectURI} />
                  </div>
                </>
              </Modal>
            ) : (
              <button type="button" onClick={doNip46Connect}>
                <FormattedMessage defaultMessage="Nostr Connect" description="Nostr Connect button" />
              </button>
            )}
            {altLogins()}
          </div>
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
            <button type="button" onClick={() => makeRandomKey()}>
              <FormattedMessage defaultMessage="Generate Key" description="Button: Generate a new key" />
            </button>
          </div>
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
