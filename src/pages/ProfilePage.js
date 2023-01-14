import "./ProfilePage.css";
import Nostrich from "../nostrich.jpg";

import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faQrcode, faGear, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import { useNavigate, useParams } from "react-router-dom";

import useProfile from "../feed/ProfileFeed";
import FollowButton from "../element/FollowButton";
import { extractLnAddress, parseId, hexToBech32 } from "../Util";
import Timeline from "../element/Timeline";
import Text from '../element/Text'
import LNURLTip from "../element/LNURLTip";
import Nip05, { useIsVerified } from "../element/Nip05";
import Copy from "../element/Copy";
import ProfilePreview from "../element/ProfilePreview";
import FollowersList from "../element/FollowersList";
import FollowsList from "../element/FollowsList";

const ProfileTab = {
    Notes: 0,
    //Reactions: 1,
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
    const about = Text({ content: user?.about })
    const { name, domain, isVerified, couldNotVerify } = useIsVerified(user?.nip05, user?.pubkey)
    const avatarUrl = (user?.picture?.length ?? 0) === 0 ? Nostrich : user?.picture
    const backgroundImage = `url(${avatarUrl})`

    useEffect(() => {
        setTab(ProfileTab.Notes);
    }, [params]);

    function username() {
      return (
          <div className="name">
               <h2>{user?.display_name || user?.name || 'Nostrich'}</h2>
               <Copy text={params.id} />
               {user?.nip05 && <Nip05 name={name} domain={domain} isVerified={isVerified} couldNotVerify={couldNotVerify} />}
          </div>
      )
    }

    function bio() {
        const lnurl = extractLnAddress(user?.lud16 || user?.lud06 || "");
        return (
            <div className="details">
                <p>{about}</p>

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
            </div>
        )
    }

    function tabContent() {
        switch (tab) {
            case ProfileTab.Notes: return <Timeline pubkeys={id} />;
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
        return null;
    }

    function avatar() {
      return (
         <div className="avatar-wrapper">
             <div style={{ '--img-url': backgroundImage }} className="avatar" data-domain={isVerified ? domain : ''}>
             </div>
         </div>
      )
    }

    function userDetails() {
      return (
         <div className="details-wrapper">
             {username()}
             {isMe ? (
                 <div className="btn btn-icon follow-button" onClick={() => navigate("/settings")}>
                     <FontAwesomeIcon icon={faGear} size="lg" />
                 </div>
             ) : <>
                     <div className="btn message-button" onClick={() => navigate(`/messages/${hexToBech32("npub", id)}`)}>
                         <FontAwesomeIcon icon={faEnvelope} size="lg" />
                     </div>
                     <FollowButton pubkey={id} />
                 </>
             }
             {bio()}
         </div>
      )
    }

    return (
        <>
            <div className="profile flex">
                {user?.banner && <img alt="banner" className="banner" src={user.banner} /> }
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
