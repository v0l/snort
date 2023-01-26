import "./ProfilePage.css";

import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import Link from "Icons/Link";
import Zap from "Icons/Zap";
import useProfile from "Feed/ProfileFeed";
import FollowButton from "Element/FollowButton";
import { extractLnAddress, parseId, hexToBech32 } from "Util";
import Avatar from "Element/Avatar";
import LogoutButton from "Element/LogoutButton";
import Timeline from "Element/Timeline";
import Text from 'Element/Text'
import LNURLTip from "Element/LNURLTip";
import Nip05 from "Element/Nip05";
import Copy from "Element/Copy";
import ProfilePreview from "Element/ProfilePreview";
import FollowersList from "Element/FollowersList";
import MutedList from "Element/MutedList";
import FollowsList from "Element/FollowsList";
import { RootState } from "State/Store";
import { HexKey } from "Nostr";
import FollowsYou from "Element/FollowsYou"

enum ProfileTab {
    Notes = "Notes",
    Reactions = "Reactions",
    Followers = "Followers",
    Follows = "Follows",
    Muted = "Muted"
};

export default function ProfilePage() {
    const params = useParams();
    const navigate = useNavigate();
    const id = useMemo(() => parseId(params.id!), [params]);
    const user = useProfile(id)?.get(id);
    const loggedOut = useSelector<RootState, boolean | undefined>(s => s.login.loggedOut);
    const muted = useSelector<RootState, HexKey[]>(s => s.login.muted);
    const isMuted = useMemo(() => muted.includes(id), [muted, id])
    const loginPubKey = useSelector<RootState, HexKey | undefined>(s => s.login.publicKey);
    const follows = useSelector<RootState, HexKey[]>(s => s.login.follows);
    const isMe = loginPubKey === id;
    const [showLnQr, setShowLnQr] = useState<boolean>(false);
    const [tab, setTab] = useState(ProfileTab.Notes);
    const aboutText = user?.about || ''
    const about = Text({ content: user?.about || '', tags: [], users: new Map() })
    const lnurl = extractLnAddress(user?.lud16 || user?.lud06 || "");

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
                {user?.nip05 && <Nip05 nip05={user.nip05} pubkey={user.pubkey} />}
                <Copy text={params.id || ""} />
                {links()}
            </div>
        )
    }

    function links() {
      return (
         <div className="links">
             {user?.website && (
                 <div className="website f-ellipsis">
                     <span className="link-icon">
                       <Link />
                     </span>
                     <a href={user.website} target="_blank" rel="noreferrer">{user.website}</a>
                 </div>
             )}

             {lnurl && (
                 <div className="ln-address" onClick={(e) => setShowLnQr(true)}>
                     <span className="link-icon">
                       <Zap />
                     </span>
                     <span className="lnurl f-ellipsis" >
                         {lnurl}
                     </span>
                 </div>
             )}
            <LNURLTip svc={lnurl} show={showLnQr} onClose={() => setShowLnQr(false)} />
         </div>
      )
    }

    function bio() {
        return aboutText.length > 0 && (
            <>
              <h3>Bio</h3>
              <div className="details">
                {about}
              </div>
            </>
        )
    }

    function tabContent() {
        switch (tab) {
            case ProfileTab.Notes:
                return <Timeline key={id} subject={{ type: "pubkey", items: [id] }} postsOnly={false} method={"LIMIT_UNTIL"} />;
            case ProfileTab.Follows: {
                if (isMe) {
                    return (
                        <div className="main-content">
                            <h4>Following {follows.length}</h4>
                            {follows.map(a => <ProfilePreview key={a} pubkey={a.toLowerCase()} options={{ about: false }} />)}
                        </div>
                    );
                } else {
                    return <FollowsList pubkey={id} />;
                }
            }
            case ProfileTab.Followers: {
                return <FollowersList pubkey={id} />
            }
            case ProfileTab.Muted: {
                return <MutedList pubkey={id} />
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
                <div className="profile-actions">
                  {isMe ? (
                    <>
                      <LogoutButton />
                      <button type="button" onClick={() => navigate("/settings")}>
                        Settings
                      </button>
                    </>
                  ) : (
                    !loggedOut && (
                      <>
                        <button type="button" onClick={() => navigate(`/messages/${hexToBech32("npub", id)}`)}>
                           Message
                        </button>
                        <FollowButton pubkey={id} />
                      </>
                    )
                  )}
                </div>
                {bio()}
            </div>
        )
    }

    return (
        <>
            <div className="profile flex">
              {user?.banner && <img alt="banner" className="banner" src={user.banner} />}
              <div className="profile-wrapper flex">
                {avatar()}
                {userDetails()}
               </div>
            </div>
            <div className="tabs">
                {[ProfileTab.Notes, ProfileTab.Followers, ProfileTab.Follows, ProfileTab.Muted].map(v => {
                    return <div className={`tab f-1${tab === v ? " active" : ""}`} key={v} onClick={() => setTab(v)}>{v}</div>
                })}
            </div>
            {tabContent()}
        </>
    )
}
