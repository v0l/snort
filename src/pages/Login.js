import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setPrivateKey } from "../state/Login";
import * as secp from '@noble/secp256k1';
import { bech32 } from "bech32";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const privateKey = useSelector(s => s.login.privateKey);
    const [key, setKey] = useState("");

    function doLogin() {
        if(key.startsWith("nsec")) {
            let nKey = bech32.decode(key);
            let buff = bech32.fromWords(nKey.words);
            let hexKey = secp.utils.bytesToHex(Uint8Array.from(buff));
            if(secp.utils.isValidPrivateKey(hexKey)) {
                dispatch(setPrivateKey(hexKey));
            } else {
                throw "INVALID PRIVATE KEY";
            }
        } else {
            if(secp.utils.isValidPrivateKey(key)) {
                dispatch(setPrivateKey(key));
            } else {
                throw "INVALID PRIVATE KEY";
            }
        }
    }

    useEffect(() => {
        if(privateKey) {
            navigate("/");
        }
    }, [privateKey]);
    return (
        <>
            <h1>Login</h1>
            <p>Enter your private key:</p>
            <div className="flex">
                <input type="text" placeholder="Private key" className="f-grow" onChange={e => setKey(e.target.value)}/>
                <div className="btn" onClick={(e) => doLogin()}>Login</div>
            </div>
            
        </>
    );
}