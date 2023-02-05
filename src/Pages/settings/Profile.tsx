import "./Profile.css";
import Nostrich from "nostrich.webp";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShop } from "@fortawesome/free-solid-svg-icons";

import useEventPublisher from "Feed/EventPublisher";
import { useUserProfile } from "Feed/ProfileFeed";
import { hexToBech32, openFile } from "Util";
import Copy from "Element/Copy";
import { RootState } from "State/Store";
import { HexKey } from "Nostr";
import useFileUpload from "Upload";

export interface ProfileSettingsProps {
    avatar?: boolean,
    banner?: boolean,
    privateKey?: boolean
}

export default function ProfileSettings(props: ProfileSettingsProps) {
    const navigate = useNavigate();
    const id = useSelector<RootState, HexKey | undefined>(s => s.login.publicKey);
    const privKey = useSelector<RootState, HexKey | undefined>(s => s.login.privateKey);
    const user = useUserProfile(id!);
    const publisher = useEventPublisher();
    const uploader = useFileUpload();

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
        delete userCopy["npub"];
        console.debug(userCopy);

        let ev = await publisher.metadata(userCopy);
        console.debug(ev);
        publisher.broadcast(ev);
    }

    async function uploadFile() {
        let file = await openFile();
        if (file) {
            console.log(file);
            let rsp = await uploader.upload(file, file.name);
            console.log(rsp);
            if (typeof rsp?.error === "string") {
                throw new Error(`Upload failed ${rsp.error}`);
            }
            return rsp.url;
        }
    }

    async function setNewAvatar() {
        const rsp = await uploadFile();
        if (rsp) {
            setPicture(rsp);
        }
    }

    async function setNewBanner() {
        const rsp = await uploadFile();
        if (rsp) {
            setBanner(rsp);
        }
    }

    function editor() {
        return (
            <div className="editor form">
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
                <div className="form-group form-col">
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
                        <button type="button" onClick={() => navigate("/verification")}>
                            <FontAwesomeIcon icon={faShop} />
                            &nbsp;
                            Buy
                        </button>
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
                    </div>
                    <div>
                        <button type="button" onClick={() => saveProfile()}>Save</button>
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
                    {(props.avatar ?? true) && (<div>
                        <h2>Avatar</h2>
                        <div style={{ backgroundImage: `url(${avatarPicture})` }} className="avatar">
                            <div className="edit" onClick={() => setNewAvatar()}>Edit</div>
                        </div>
                    </div>)}
                    {(props.banner ?? true) && (<div>
                        <h2>Header</h2>
                        <div style={{ backgroundImage: `url(${(banner?.length ?? 0) === 0 ? Nostrich : banner})` }} className="banner">
                            <div className="edit" onClick={() => setNewBanner()}>Edit</div>
                        </div>
                    </div>)}
                </div>
                {editor()}
            </>
        )
    }

    return (
        <div className="settings">
            <h3>Edit Profile</h3>
            {settings()}
            {privKey && (props.privateKey ?? true) && (<div className="flex f-col bg-grey">
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
