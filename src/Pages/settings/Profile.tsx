import "./Profile.css";
import Nostrich from "nostrich.jpg";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShop } from "@fortawesome/free-solid-svg-icons";

import useEventPublisher from "Feed/EventPublisher";
import useProfile from "Feed/ProfileFeed";
import VoidUpload from "Feed/VoidUpload";
import { logout } from "State/Login";
import { hexToBech32, openFile } from "Util";
import Copy from "Element/Copy";
import { RootState } from "State/Store";
import { HexKey } from "Nostr";
import { VoidCatHost } from "Const";

export default function ProfileSettings() {
    const navigate = useNavigate();
    const id = useSelector<RootState, HexKey | undefined>(s => s.login.publicKey);
    const privKey = useSelector<RootState, HexKey | undefined>(s => s.login.privateKey);
    const dispatch = useDispatch();
    const user = useProfile(id)?.get(id || "");
    const publisher = useEventPublisher();

    const [name, setName] = useState<string>();
    const [displayName, setDisplayName] = useState<string>();
    const [picture, setPicture] = useState<string>();
    const [banner, setBanner] = useState<string>();
    const [about, setAbout] = useState<string>();
    const [website, setWebsite] = useState<string>();
    const [nip05, setNip05] = useState<string>();
    const [lud16, setLud16] = useState<string>();

    const avatarPicture = (picture?.length ?? 0) === 0 ? Nostrich : picture

    useEffect(() => {
        if (user) {
            setName(user.name);
            setDisplayName(user.display_name)
            setPicture(user.picture);
            setBanner(user.banner);
            setAbout(user.about);
            setWebsite(user.website);
            setNip05(user.nip05);
            setLud16(user.lud16);
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
            banner,
            website,
            nip05,
            lud16
        };
        delete userCopy["loaded"];
        delete userCopy["created"];
        delete userCopy["pubkey"];
        console.debug(userCopy);

        let ev = await publisher.metadata(userCopy);
        console.debug(ev);
        publisher.broadcast(ev);
    }

    async function uploadFile() {
        let file = await openFile();
        if (file) {
            console.log(file);
            let rsp = await VoidUpload(file, file.name);
            if (!rsp?.ok) {
                throw "Upload failed, please try again later";
            }
            return rsp.file;
        }
    }

    async function setNewAvatar() {
        const rsp = await uploadFile();
        if (rsp) {
            setPicture(rsp.meta?.url ?? `${VoidCatHost}d/${rsp.id}`);
        }
    }

    async function setNewBanner() {
        const rsp = await uploadFile();
        if (rsp) {
            setBanner(rsp.meta?.url ?? `${VoidCatHost}/d/${rsp.id}`);
        }
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

    function settings() {
        if (!id) return null;
        return (
            <>
                <div className="flex f-center image-settings">
                    <div>
                        <h2>Avatar</h2>
                        <div style={{ backgroundImage: `url(${avatarPicture})` }} className="avatar">
                            <div className="edit" onClick={() => setNewAvatar()}>Edit</div>
                        </div>
                    </div>
                    <div>
                        <h2>Header</h2>
                        <div style={{ backgroundImage: `url(${(banner?.length ?? 0) === 0 ? Nostrich : banner})` }} className="banner">
                            <div className="edit" onClick={() => setNewBanner()}>Edit</div>
                        </div>
                    </div>
                </div>
                {editor()}
            </>
        )
    }

    return (
        <div className="settings">
            <h3>Profile</h3>
            {settings()}
            {privKey && (<div className="flex f-col bg-grey">
                <div>
                    <h4>Your Private Key Is (do not share this with anyone):</h4>
                </div>
                <div>
                    <Copy text={hexToBech32("nsec", privKey)} />
                </div>
            </div>)}
        </div>
    );
}
