import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import * as secp from '@noble/secp256k1';

import { RootState } from "State/Store";
import { setPrivateKey, setPublicKey, setRelays } from "State/Login";
import { DefaultRelays, EmailRegex } from "Const";
import { bech32ToHex } from "Util";
import { HexKey } from "Nostr";

export default function LoginPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const publicKey = useSelector<RootState, HexKey | undefined>(s => s.login.publicKey);
    const [key, setKey] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (publicKey) {
            navigate("/");
        }
    }, [publicKey, navigate]);

    async function getNip05PubKey(addr: string) {
        let [username, domain] = addr.split("@");
        let rsp = await fetch(`https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(username)}`);
        if (rsp.ok) {
            let data = await rsp.json();
            let pKey = data.names[username];
            if (pKey) {
                return pKey;
            }
        }
        throw new Error("User key not found")
    }

    async function doLogin() {

        try {
            if (key.startsWith("nsec")) {
                let hexKey = bech32ToHex(key);
                if (secp.utils.isValidPrivateKey(hexKey)) {
                    dispatch(setPrivateKey(hexKey));
                } else {
                    throw new Error("INVALID PRIVATE KEY");
                }
            } else if (key.startsWith("npub")) {
                let hexKey = bech32ToHex(key);
                dispatch(setPublicKey(hexKey));
            } else if (key.match(EmailRegex)) {
                let hexKey = await getNip05PubKey(key);
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
        let newKey = secp.utils.bytesToHex(secp.utils.randomPrivateKey());
        dispatch(setPrivateKey(newKey));

        try {
            let rsp = await fetch("https://api.nostr.watch/v1/online");
            if (rsp.ok) {
                let online: string[] = await rsp.json();
                let pickRandom = online.sort((a, b) => Math.random() >= 0.5 ? 1 : -1).slice(0, 4); // pick 4 random relays

                let relayObjects = pickRandom.map(a => [a, { read: true, write: true }]);
                dispatch(setRelays({
                    relays: Object.fromEntries(relayObjects),
                    createdAt: 1
                }));
            }
        } catch (e) {
            console.warn(e);
        }
        navigate("/new");
    }

    async function doNip07Login() {
        let pubKey = await window.nostr.getPublicKey();
        dispatch(setPublicKey(pubKey));

        if ("getRelays" in window.nostr) {
            let relays = await window.nostr.getRelays();
            dispatch(setRelays({
                relays: {
                    ...relays,
                    ...Object.fromEntries(DefaultRelays.entries())
                },
                createdAt: 1
            }));
        }
    }

    function altLogins() {
        let nip07 = 'nostr' in window;
        if (!nip07) {
            return null;
        }

        return (
            <>
                <h2>Other Login Methods</h2>
                <div className="flex">
                    <button type="button" onClick={(e) => doNip07Login()}>Login with Extension (NIP-07)</button>
                </div>
            </>
        )
    }

    return (
        <div className="main-content">
            <h1>Login</h1>
            <div className="flex">
                <input type="text" placeholder="nsec / npub / nip-05 / hex private key..." className="f-grow" onChange={e => setKey(e.target.value)} />
            </div>
            {error.length > 0 ? <b className="error">{error}</b> : null}
            <div className="tabs">
                <button type="button" onClick={(e) => doLogin()}>Login</button>
                <button type="button" onClick={() => makeRandomKey()}>Generate Key</button>
            </div>
            {altLogins()}
        </div>
    );
}
