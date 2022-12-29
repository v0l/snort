import "./ProfilePage.css";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { bech32 } from "bech32";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faQrcode } from "@fortawesome/free-solid-svg-icons";
import { useParams } from "react-router-dom";

import useProfile from "../feed/ProfileFeed";
import { resetProfile } from "../state/Users";
import Nostrich from "../nostrich.jpg";
import useEventPublisher from "../feed/EventPublisher";
import useTimelineFeed from "../feed/TimelineFeed";
import Note from "../element/Note";
import QRCodeStyling from "qr-code-styling";
import ReactModal from "react-modal";

export default function ProfilePage() {
    const dispatch = useDispatch();
    const params = useParams();
    const id = params.id;
    const user = useProfile(id);
    const publisher = useEventPublisher();
    const { notes } = useTimelineFeed([id]);
    const loginPubKey = useSelector(s => s.login.publicKey);
    const isMe = loginPubKey === id;
    const qrRef = useRef();

    const [name, setName] = useState("");
    const [picture, setPicture] = useState("");
    const [about, setAbout] = useState("");
    const [website, setWebsite] = useState("");
    const [nip05, setNip05] = useState("");
    const [lud16, setLud16] = useState("");
    const [showLnQr, setShowLnQr] = useState(false);

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

    useEffect(() => {
        // some clients incorrectly set this to LNURL service, patch this
        if (lud16.toLowerCase().startsWith("lnurl")) {
            let decoded = bech32.decode(lud16, 1000);
            let url = new TextDecoder().decode(Uint8Array.from(bech32.fromWords(decoded.words)));
            if (url.startsWith("http")) {
                let parsedUri = new URL(url);
                // is lightning address
                if (parsedUri.pathname.startsWith("/.well-known/lnurlp/")) {
                    let pathParts = parsedUri.pathname.split('/');
                    let username = pathParts[pathParts.length - 1];
                    setLud16(`${username}@${parsedUri.hostname}`);
                }
            }
        }
    }, [lud16]);

    useEffect(() => {
        if (qrRef.current && showLnQr) {
            let qr = new QRCodeStyling({
                data: "",
                type: "canvas"
            });
            qrRef.current.innerHTML = "";
            qr.append(qrRef.current);
        }
    }, [showLnQr]);

    async function saveProfile() {
        let ev = await publisher.metadata({
            name,
            about,
            picture,
            website,
            nip05,
            lud16
        });
        console.debug(ev);
        publisher.broadcast(ev);
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
                    <div>LN Address:</div>
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

    function details() {
        return (
            <>
                <h2>{name}</h2>
                <p>{about}</p>
                {website ? <a href={website} target="_blank" rel="noreferrer">{website}</a> : null}
                {lud16 ? <div className="flex f-center">
                    <div className="btn" onClick={(e) => setShowLnQr(true)}>
                        <FontAwesomeIcon icon={faQrcode} size="xl" />
                    </div>
                    <div>&nbsp; ⚡️ {lud16}</div>
                </div> : null}
                {showLnQr === true ?
                    <ReactModal isOpen={showLnQr} onRequestClose={() => setShowLnQr(false)} overlayClassName="modal" className="modal-content" preventScroll={true}>
                        <div ref={qrRef}>QR</div>
                    </ReactModal> : null}
            </>
        )
    }

    return (
        <>
            <div className="profile">
                <div>
                    <div style={{ backgroundImage: `url(${picture})` }} className="avatar">
                        {isMe ?
                            <div className="edit">
                                <div>Edit</div>
                            </div>
                            : null
                        }
                    </div>
                </div>
                <div>
                    {isMe ? editor() : details()}
                </div>
            </div>
            <br />
            <div className="btn">Notes</div>
            {notes?.sort((a, b) => b.created_at - a.created_at).map(a => <Note key={a.id} data={a} />)}
        </>
    )
}