import "./ProfilePage.css";
import Nostrich from "../nostrich.jpg";

import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faQrcode, faGear } from "@fortawesome/free-solid-svg-icons";
import { useNavigate, useParams } from "react-router-dom";

import useProfile from "../feed/ProfileFeed";
import FollowButton from "../element/FollowButton";
import { extractLnAddress, parseId } from "../Util";
import Timeline from "../element/Timeline";
import { extractLinks } from '../Text'
import LNURLTip from "../element/LNURLTip";
import Nip05 from "../element/Nip05";
import Copy from "../element/Copy";
import ProfilePreview from "../element/ProfilePreview";
import FollowersList from "../element/FollowersList";

const ProfileTab = {
    Notes: 0,
    Reactions: 1,
    Followers: 2,
    Follows: 3
};

export default function ProfilePage() {
    const params = useParams();
    const navigate = useNavigate();
    const id = useMemo(() => parseId(params.id), [params]);
    const user = useProfile(id);
    const loginPubKey = useSelector(s => s.login.publicKey);
    const follows = useSelector(s => s.login.follows);
    const isMe = loginPubKey === id;
    const [showLnQr, setShowLnQr] = useState(false);
    const [tab, setTab] = useState(ProfileTab.Notes);

    useEffect(() => {
        setTab(ProfileTab.Notes);
    }, [params]);

    function details() {
        const lnurl = extractLnAddress(user?.lud16 || user?.lud06 || "");
        return (
            <>
                <div className="flex name">
                    <div className="f-grow">
                        <h2>{user?.display_name || user?.name}</h2>
                        <Copy text={params.id} />
                        {user?.nip05 && <Nip05 nip05={user.nip05} pubkey={user.pubkey} />}
                    </div>
                    <div>
                        {isMe ? (
                            <div className="btn btn-icon" onClick={() => navigate("/settings")}>
                              <FontAwesomeIcon icon={faGear} size="lg" />
                            </div>
                          ) : <FollowButton pubkey={id} />
                        }
                    </div>
                </div>
                <p>{extractLinks([user?.about])}</p>

                {user?.website && (
                  <div className="website f-ellipsis">
                    <a href={user.website} target="_blank" rel="noreferrer">{user.website}</a>
                  </div>
                )}

                {lnurl ? <div className="lnurl f-ellipsis">
                    {lnurl}
                    <div className="btn btn-icon" onClick={(e) => setShowLnQr(true)}>
                      <FontAwesomeIcon icon={faQrcode} size="lg" />
                    </div>
                </div> : null}
                <LNURLTip svc={lnurl} show={showLnQr} onClose={() => setShowLnQr(false)} />
            </>
        )
    }

    function tabContent() {
        switch (tab) {
            case ProfileTab.Notes: return <Timeline pubkeys={id} />;
            case ProfileTab.Follows: {
                if (isMe) {
                    return follows.map(a => <ProfilePreview key={a} pubkey={a.toLowerCase()} options={{ about: false }} />)
                }
            }
            case ProfileTab.Followers: {
                return <FollowersList pubkey={id} />
            }
        }
        return null;
    }

    return (
        <>
            <div className="profile flex">
                <div className="avatar-wrapper">
                    <div style={{ backgroundImage: `url(${(user?.picture?.length ?? 0) === 0 ? Nostrich : user?.picture})` }} className="avatar">
                    </div>
                </div>
                <div className="f-grow details">
                  {details()}
                </div>
            </div>
            <div className="tabs">
                {
                    Object.entries(ProfileTab).map(([k, v]) => {
                        return <div className={`tab f-1${tab === v ? " active" : ""}`} key={k} onClick={() => setTab(v)}>{k}</div>
                    }
                    )
                }
            </div>
            {tabContent()}
        </>
    )
}
