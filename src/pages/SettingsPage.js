import "./SettingsPage.css";
import Nostrich from "../nostrich.jpg";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import useEventPublisher from "../feed/EventPublisher";
import useProfile from "../feed/ProfileFeed";
import VoidUpload from "../feed/VoidUpload";
import { logout } from "../state/Login";
import { resetProfile } from "../state/Users";
import { openFile } from "../Util";

export default function SettingsPage(props) {
    const id = useSelector(s => s.login.publicKey);
    const dispatch = useDispatch();
    const user = useProfile(id);
    const publisher = useEventPublisher();

    const [name, setName] = useState("");
    const [picture, setPicture] = useState("");
    const [about, setAbout] = useState("");
    const [website, setWebsite] = useState("");
    const [nip05, setNip05] = useState("");
    const [lud06, setLud06] = useState("");
    const [lud16, setLud16] = useState("");

    useEffect(() => {
        if (user) {
            setName(user.name ?? "");
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

    function editor() {
        return (
            <div className="editor">
                <div className="form-group">
                    <div>Name:</div>
                    <div>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
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
                        <input type="text" value={nip05} onChange={(e) => setNip05(e.target.value)} />
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
                        <div className="btn" onClick={() => dispatch(logout())}>Logout</div>
                    </div>
                    <div>
                        <div className="btn" onClick={() => saveProfile()}>Save</div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="settings">
            <h1>Settings</h1>
            <div className="flex f-center">
                <div style={{ backgroundImage: `url(${picture.length === 0 ? Nostrich : picture})` }} className="avatar">
                    <div className="edit">Edit</div>
                </div>
            </div>

            {editor()}
        </div>
    );
}