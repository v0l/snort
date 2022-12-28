import "./ProfilePage.css";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import useProfile from "./feed/ProfileFeed";
import { useContext, useEffect, useState } from "react";
import Event from "../nostr/Event";
import { NostrContext } from "..";
import { resetProfile } from "../state/Users";
import Nostrich from "../nostrich.jpg";

export default function ProfilePage() {
    const system = useContext(NostrContext);
    const dispatch = useDispatch();
    const params = useParams();
    const id = params.id;
    const user = useProfile(id);
    const loginPubKey = useSelector(s => s.login.publicKey);
    const privKey = useSelector(s => s.login.privateKey);
    const isMe = loginPubKey === id;

    let [name, setName] = useState("");
    let [picture, setPicture] = useState("");
    let [about, setAbout] = useState("");
    let [website, setWebsite] = useState("");
    let [nip05, setNip05] = useState("");
    let [lud16, setLud16] = useState("");

    useEffect(() => {
        if (user) {
            setName(user.name ?? "");
            setPicture(user.picture ?? Nostrich);
            setAbout(user.about ?? "");
            setWebsite(user.website ?? "");
            setNip05(user.nip05 ?? "");
            setLud16(user.lud16 ?? "");
        }
    }, [user]);

    async function saveProfile() {
        let ev = Event.SetMetadata(id, {
            name,
            about,
            picture,
            website,
            nip05,
            lud16
        });
        await ev.Sign(privKey);

        console.debug(ev);
        system.BroadcastEvent(ev);
        dispatch(resetProfile(id));
    }

    function editor() {
        return (
            <>
                <div className="form-group">
                    <div>Name:</div>
                    <div>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                </div>
                <div className="form-group">
                    <div>About:</div>
                    <div>
                        <input type="text" value={about} onChange={(e) => setAbout(e.target.value)} />
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
                    <div>Lightning Address:</div>
                    <div>
                        <input type="text" value={lud16} onChange={(e) => setLud16(e.target.value)} />
                    </div>
                </div>
                <div className="form-group">
                    <div></div>
                    <div>
                        <div className="btn" onClick={() => saveProfile()}>Save</div>
                    </div>
                </div>
            </>
        )
    }

    return (
        <div className="profile">
            <div>
                <div style={{ backgroundImage: `url(${picture})` }} className="avatar">
                    <div className="edit">
                        <div>Edit</div>
                    </div>
                </div>
            </div>
            <div>
                {isMe ? editor() : null}
            </div>

        </div>
    )
}