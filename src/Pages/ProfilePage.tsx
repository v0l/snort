import "./ProfilePage.css";

import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear, faEnvelope, faQrcode } from "@fortawesome/free-solid-svg-icons";
import { useNavigate, useParams } from "react-router-dom";

import { useUserProfile } from "Feed/ProfileFeed";
import FollowButton from "Element/FollowButton";
import { extractLnAddress, parseId, hexToBech32 } from "Util";
import Avatar from "Element/Avatar";
import Timeline from "Element/Timeline";
import Text from 'Element/Text'
import LNURLTip from "Element/LNURLTip";
import Nip05 from "Element/Nip05";
import Copy from "Element/Copy";
import ProfilePreview from "Element/ProfilePreview";
import FollowersList from "Element/FollowersList";
import FollowsList from "Element/FollowsList";
import { RootState } from "State/Store";
import { HexKey } from "Nostr";
import FollowsYou from "Element/FollowsYou"
import QrCode from "Element/QrCode";
import Modal from "Element/Modal";

enum ProfileTab {
    Notes = "Notes",
    Reactions = "Reactions",
    Followers = "Followers",
    Follows = "Follows"
};

export default function ProfilePage() {
    const params = useParams();
    const navigate = useNavigate();
    const id = useMemo(() => parseId(params.id!), [params]);
    const user = useUserProfile(id);
    const loginPubKey = useSelector<RootState, HexKey | undefined>(s => s.login.publicKey);
    const follows = useSelector<RootState, HexKey[]>(s => s.login.follows);
    const isMe = loginPubKey === id;
    const [showLnQr, setShowLnQr] = useState<boolean>(false);
    const [tab, setTab] = useState(ProfileTab.Notes);
    const [showProfileQr, setShowProfileQr] = useState<boolean>(false);
    const about = Text({ content: user?.about || '', tags: [], users: new Map() })

    useEffect(() => {
        setTab(ProfileTab.Notes);
    }, [params]);

    function username() {
        return (
            <div className="name">
                <h2>
                    {user?.display_name || user?.name || 'Nostrich'}
                    <FollowsYou pubkey={id} />
                </h2>
                <Copy text={params.id || ""} />
                {user?.nip05 && <Nip05 nip05={user.nip05} pubkey={user.pubkey} />}
            </div>
        )
    }

    function bio() {
        const lnurl = extractLnAddress(user?.lud16 || user?.lud06 || "");
        return (
            <div className="details">
                <div>{about}</div>

                <div className="links">
                    {user?.website && (
                        <div className="website f-ellipsis">
                            <a href={user.website} target="_blank" rel="noreferrer">{user.website}</a>
                        </div>
                    )}

                    {lnurl && (
                        <div className="f-ellipsis" onClick={(e) => setShowLnQr(true)}>
                            <span className="zap">⚡️</span>
                            <span className="lnurl" >
                                {lnurl}
                            </span>
                        </div>
                    )}
                </div>
                <LNURLTip svc={lnurl} show={showLnQr} onClose={() => setShowLnQr(false)} />
            </div>
        )
    }

    function tabContent() {
        switch (tab) {
            case ProfileTab.Notes:
                return <Timeline key={id} subject={{ type: "pubkey", items: [id] }} postsOnly={false} method={"LIMIT_UNTIL"} />;
            case ProfileTab.Follows: {
                if (isMe) {
                    return (
                        <>
                            <h4>Following {follows.length}</h4>
                            {follows.map(a => <ProfilePreview key={a} pubkey={a.toLowerCase()} options={{ about: false }} />)}
                        </>
                    );
                } else {
                    return <FollowsList pubkey={id} />;
                }
            }
            case ProfileTab.Followers: {
                return <FollowersList pubkey={id} />
            }
        }
    }

    function avatar() {
        return (
            <div className="avatar-wrapper">
                <Avatar user={user} />
            </div>
        )
    }

    function userDetails() {
        return (
            <div className="details-wrapper">
                {username()}

                <div className="p-buttons">
                    <div className="btn" onClick={() => setShowProfileQr(true)}>
                        <FontAwesomeIcon icon={faQrcode} size="lg" />
                    </div>
                    {showProfileQr && (<Modal onClose={() => setShowProfileQr(false)}>
                        <div className="card">
                            <QrCode data={`nostr:${hexToBech32("npub", id)}`} link={undefined} className="m10"
                                avatar={user?.picture}/>
                        </div>
                    </Modal>)}
                    {isMe ? (
                        <div className="btn" onClick={() => navigate("/settings")}>
                            <FontAwesomeIcon icon={faGear} size="lg" />
                        </div>
                    ) : <>
                        <div className="btn" onClick={() => navigate(`/messages/${hexToBech32("npub", id)}`)}>
                            <FontAwesomeIcon icon={faEnvelope} size="lg" />
                        </div>
                        <FollowButton pubkey={id} />
                    </>
                    }
                </div>

                {bio()}
            </div>
        )
    }

    return (
        <>
            <div className="profile flex">
                {user?.banner && <img alt="banner" className="banner" src={user.banner} />}
                {user?.banner ? (
                    <>
                        {avatar()}
                        {userDetails()}
                    </>
                ) : (
                    <div className="no-banner">
                        {avatar()}
                        {userDetails()}
                    </div>
                )}
            </div>
            <div className="tabs">
                {[ProfileTab.Notes, ProfileTab.Followers, ProfileTab.Follows].map(v => {
                    return <div className={`tab f-1${tab === v ? " active" : ""}`} key={v} onClick={() => setTab(v)}>{v}</div>
                })}
            </div>
            {tabContent()}
        </>
    )
}
