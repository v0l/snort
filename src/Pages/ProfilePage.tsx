import "./ProfilePage.css";

import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { formatShort } from "Number";
import Link from "Icons/Link";
import Qr from "Icons/Qr";
import Zap from "Icons/Zap";
import Envelope from "Icons/Envelope";
import { useUserProfile } from "Feed/ProfileFeed";
import useZapsFeed from "Feed/ZapsFeed";
import { default as ZapElement, parseZap } from "Element/Zap";
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
import BlockList from "Element/BlockList";
import MutedList from "Element/MutedList";
import FollowsList from "Element/FollowsList";
import IconButton from "Element/IconButton";
import { RootState } from "State/Store";
import { HexKey } from "Nostr";
import FollowsYou from "Element/FollowsYou"
import QrCode from "Element/QrCode";
import Modal from "Element/Modal";
import { ProxyImg } from "Element/ProxyImg"

enum ProfileTab {
  Notes = "Notes",
  Reactions = "Reactions",
  Followers = "Followers",
  Follows = "Follows",
  Zaps = "Zaps",
  Muted = "Muted",
  Blocked = "Blocked"
};

export default function ProfilePage() {
  const params = useParams();
  const navigate = useNavigate();
  const id = useMemo(() => parseId(params.id!), [params]);
  const user = useUserProfile(id);
  const loggedOut = useSelector<RootState, boolean | undefined>(s => s.login.loggedOut);
  const loginPubKey = useSelector<RootState, HexKey | undefined>(s => s.login.publicKey);
  const follows = useSelector<RootState, HexKey[]>(s => s.login.follows);
  const isMe = loginPubKey === id;
  const [showLnQr, setShowLnQr] = useState<boolean>(false);
  const [tab, setTab] = useState(ProfileTab.Notes);
  const [showProfileQr, setShowProfileQr] = useState<boolean>(false);
  const aboutText = user?.about || ''
  const about = Text({ content: aboutText, tags: [], users: new Map(), creator: "" })
  const lnurl = extractLnAddress(user?.lud16 || user?.lud06 || "");
  const website_url = (user?.website && !user.website.startsWith("http"))
  ? "https://" + user.website
  : user?.website || "";
  const zapFeed = useZapsFeed(id)
  const zaps = useMemo(() => {
    const profileZaps = zapFeed.store.notes.map(parseZap).filter(z => z.valid && z.p === id && !z.e && z.zapper !== id)
    profileZaps.sort((a, b) => b.amount - a.amount)
    return profileZaps
  }, [zapFeed.store.notes, id])
  const zapsTotal = zaps.reduce((acc, z) => acc + z.amount, 0)

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
            <a href={website_url} target="_blank" rel="noreferrer">{user.website}</a>
          </div>
        )}

        <LNURLTip svc={lnurl} show={showLnQr} onClose={() => setShowLnQr(false)} author={id} />
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
        return <Timeline key={id} subject={{ type: "pubkey", items: [id], discriminator: id.slice(0, 12) }} postsOnly={false} method={"LIMIT_UNTIL"} ignoreModeration={true} />;
      case ProfileTab.Zaps: {
        return (
          <div className="main-content">
            {zaps.map(z => <ZapElement showZapped={false} zap={z} />)}
          </div>
        )
      }

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
        return isMe ? <BlockList variant="muted" /> : <MutedList pubkey={id} />
      }
      case ProfileTab.Blocked: {
        return isMe ? <BlockList variant="blocked" /> : null
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

  function renderIcons() {
    return (
      <div className="icon-actions">
        <IconButton onClick={() => setShowProfileQr(true)}>
          <Qr width={14} height={16} />
        </IconButton>
        {showProfileQr && (
          <Modal className="qr-modal" onClose={() => setShowProfileQr(false)}>
            <QrCode data={`nostr:${hexToBech32("npub", id)}`} link={undefined} className="m10" />
          </Modal>
        )}
        {isMe ? (
          <>
            <LogoutButton />
            <button type="button" onClick={() => navigate("/settings")}>
              Settings
            </button>
          </>
        ) : (
          <>
            <IconButton onClick={() => setShowLnQr(true)}>
              <Zap width={14} height={16} />
              <span className="zap-amount">
                {zapsTotal > 0 && formatShort(zapsTotal)}
               </span>
            </IconButton>
            {!loggedOut && (
              <>
                <IconButton onClick={() => navigate(`/messages/${hexToBech32("npub", id)}`)}>
                  <Envelope width={16} height={13} />
                </IconButton>
              </>
            )}
          </>
        )}
      </div>
    )
  }

  function userDetails() {
    return (
      <div className="details-wrapper">
        {username()}
        <div className="profile-actions">
          {renderIcons()}
          {!isMe && <FollowButton pubkey={id} />}
        </div>
        {bio()}
      </div>
    )
  }

  function renderTab(v: ProfileTab) {
    return <div className={`tab f-1${tab === v ? " active" : ""}`} key={v} onClick={() => setTab(v)}>{v}</div>
  }

  const w = window.document.querySelector(".page")?.clientWidth;
  return (
    <>
      <div className="profile flex">
        {user?.banner && <ProxyImg alt="banner" className="banner" src={user.banner} size={w} />}
        <div className="profile-wrapper flex">
          {avatar()}
          {userDetails()}
        </div>
      </div>
      <div className="tabs">
        {[ProfileTab.Notes, ProfileTab.Followers, ProfileTab.Follows, ProfileTab.Zaps, ProfileTab.Muted].map(renderTab)}
        {isMe && renderTab(ProfileTab.Blocked)}
      </div>
      {tabContent()}
    </>
  )
}
