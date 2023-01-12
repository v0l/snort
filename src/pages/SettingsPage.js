import "./SettingsPage.css";
import Nostrich from "../nostrich.jpg";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShop } from "@fortawesome/free-solid-svg-icons";

import useEventPublisher from "../feed/EventPublisher";
import useProfile from "../feed/ProfileFeed";
import VoidUpload from "../feed/VoidUpload";
import { logout, setRelays } from "../state/Login";
import { resetProfile } from "../state/Users";
import { openFile } from "../Util";
import Relay from "../element/Relay";

export default function SettingsPage(props) {
    const navigate = useNavigate();
    const id = useSelector(s => s.login.publicKey);
    const relays = useSelector(s => s.login.relays);
    const dispatch = useDispatch();
    const user = useProfile(id);
    const publisher = useEventPublisher();

    const [name, setName] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [picture, setPicture] = useState("");
    const [about, setAbout] = useState("");
    const [website, setWebsite] = useState("");
    const [nip05, setNip05] = useState("");
    const [lud06, setLud06] = useState("");
    const [lud16, setLud16] = useState("");
    const [newRelay, setNewRelay] = useState("");

    useEffect(() => {
        if (user) {
            setName(user.name ?? "");
            setDisplayName(user.display_name ?? "")
            setPicture(user.picture ?? "");
            setAbout(user.about ?? "");
            setWebsite(user.website ?? "");
            setNip05(user.nip05 ?? "");
            setLud06(user.lud06 ?? "");
            setLud16(user.lud16 ?? "");
        }
    }, [user]);

    async function saveProfile() {
        // copy user object and delete internal fields
        let userCopy = {
            ...user,
            name,
            display_name: displayName,
            about,
            picture,
            website,
            nip05,
            lud16
        };
        delete userCopy["loaded"];
        delete userCopy["fromEvent"];
        // event top level props should not be copied into metadata (bug)
        delete userCopy["pubkey"];
        delete userCopy["sig"];
        delete userCopy["pubkey"];
        delete userCopy["tags"];
        delete userCopy["content"];
        delete userCopy["created_at"];
        delete userCopy["id"];
        delete userCopy["kind"]

        // trim empty string fields
        Object.keys(userCopy).forEach(k => {
            if (userCopy[k] === "") {
                delete userCopy[k];
            }
        });
        console.debug(userCopy);

        let ev = await publisher.metadata(userCopy);
        console.debug(ev);
        dispatch(resetProfile(id));
        publisher.broadcast(ev);
    }

    async function setNewAvatar() {
        let file = await openFile();
        console.log(file);
        let rsp = await VoidUpload(file);
        if (!rsp) {
            throw "Upload failed, please try again later";
        }
        console.log(rsp);
        setPicture(rsp.metadata.url ?? `https://void.cat/d/${rsp.id}`)
    }

    async function saveRelays() {
        let ev = await publisher.saveRelays();
        publisher.broadcast(ev);
    }

    function editor() {
        return (
            <div className="editor">
                <div className="form-group">
                    <div>Name:</div>
                    <div>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                </div>
                <div className="form-group">
                    <div>Display name:</div>
                    <div>
                        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                    </div>
                </div>
                <div className="form-group f-col">
                    <div>About:</div>
                    <div className="w-max">
                        <textarea className="w-max" onChange={(e) => setAbout(e.target.value)} value={about}></textarea>
                    </div>
                </div>
                <div className="form-group">
                    <div>Website:</div>
                    <div>
                        <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} />
                    </div>
                </div>
                <div className="form-group">
                    <div>NIP-05:</div>
                    <div>
                        <input type="text" className="mr10" value={nip05} onChange={(e) => setNip05(e.target.value)} />
                        <div className="btn" onClick={() => navigate("/verification")}>
                            <FontAwesomeIcon icon={faShop} />
                            &nbsp;
                            Buy
                        </div>
                    </div>
                </div>
                <div className="form-group">
                    <div>LN Address:</div>
                    <div>
                        <input type="text" value={lud16} onChange={(e) => setLud16(e.target.value)} />
                    </div>
                </div>
                <div className="form-group">
                    <div>
                        <div className="btn" onClick={() => { dispatch(logout()); navigate("/"); }}>Logout</div>
                    </div>
                    <div>
                        <div className="btn" onClick={() => saveProfile()}>Save</div>
                    </div>
                </div>
            </div>
        )
    }

    function addRelay() {
        return (
            <>
                <h4>Add Relays</h4>
                <div className="flex mb10">
                    <input type="text" className="f-grow" placeholder="wss://my-relay.com" value={newRelay} onChange={(e) => setNewRelay(e.target.value)} />
                </div>
                <div className="btn mb10" onClick={() => dispatch(setRelays({ [newRelay]: { read: false, write: false } }))}>Add</div>
            </>
        )
    }

    function settings() {
        if (!id) return null;
        return (
            <>
                <h1>Settings</h1>
                <div className="flex f-center">
                    <div style={{ backgroundImage: `url(${picture.length === 0 ? Nostrich : picture})` }} className="avatar">
                        <div className="edit" onClick={() => setNewAvatar()}>Edit</div>
                    </div>
                </div>
                {editor()}
            </>
        )
    }

    return (
        <div className="settings">
            {settings()}
            <h4>Relays</h4>
            <div className="flex f-col">
                {Object.keys(relays || {}).map(a => <Relay addr={a} key={a} />)}
            </div>
            <div className="flex">
                <div className="f-grow"></div>
                <div className="btn" onClick={() => saveRelays()}>Save</div>
            </div>
            {addRelay()}
        </div>
    );
}