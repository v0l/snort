import "./ProfilePage.css";
import { useMemo, useRef, useState } from "react";
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
import Modal from "../element/Modal";
import { logout } from "../state/Login";
import FollowButton from "../element/FollowButton";
import VoidUpload from "../feed/VoidUpload";
import { openFile } from "../Util";

export default function ProfilePage() {
    const dispatch = useDispatch();
    const params = useParams();
    const id = params.id;
    const user = useProfile(id);
    const publisher = useEventPublisher();
    const { notes } = useTimelineFeed(id);
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

    useMemo(() => {
        if (user) {
            setName(user.name ?? "");
            setPicture(user.picture ?? "");
            setAbout(user.about ?? "");
            setWebsite(user.website ?? "");
            setNip05(user.nip05 ?? "");
            setLud16(user.lud16 ?? "");
        }
    }, [user]);

    useMemo(() => {
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

    useMemo(() => {
        if (qrRef.current && showLnQr) {
            let qr = new QRCodeStyling({
                data: { lud16 },
                type: "canvas"
            });
            qrRef.current.innerHTML = "";
            qr.append(qrRef.current);
        }
    }, [showLnQr]);

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
                        <textarea onChange={(e) => setAbout(e.target.value)} value={about}></textarea>
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

    function details() {
        return (
            <>
                <div className="flex">
                    <h2 className="f-grow">{name}</h2>
                    <div>
                        <FollowButton pubkey={id} />
                    </div>
                </div>
                <p>{about}</p>
                {website ? <a href={website} target="_blank" rel="noreferrer">{website}</a> : null}

                {lud16 ? <div className="flex">
                    <div className="btn" onClick={(e) => setShowLnQr(true)}>
                        <FontAwesomeIcon icon={faQrcode} size="xl" />
                    </div>
                    <div className="f-ellipsis">&nbsp; ⚡️ {lud16.length > 20 ? lud16.substring(0, 20) : lud16}</div>
                </div> : null}
                {showLnQr === true ?
                    <Modal onClose={() => setShowLnQr(false)}>
                        <h4>{lud16}</h4>
                        <div ref={qrRef}></div>
                    </Modal> : null}
            </>
        )
    }

    return (
        <>
            <div className="profile flex">
                <div>
                    <div style={{ backgroundImage: `url(${picture.length === 0 ? Nostrich : picture})` }} className="avatar">
                        {isMe ?
                            <div className="edit" onClick={() => setNewAvatar()}>
                                <div>Edit</div>
                            </div>
                            : null
                        }
                    </div>
                </div>
                <div className="f-grow">
                    {isMe ? editor() : details()}
                </div>
            </div>
            <div className="tabs">
                <div className="btn active">Notes</div>
                <div className="btn">Reactions</div>
                <div className="btn">Followers</div>
                <div className="btn">Follows</div>
                <div className="btn">Relays</div>
            </div>
            {notes?.sort((a, b) => b.created_at - a.created_at).map(a => <Note key={a.id} data={a} />)}
        </>
    )
}