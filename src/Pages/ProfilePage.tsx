import "./ProfilePage.css";
import { useEffect, useMemo, useState } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { formatShort } from "Number";
import { Tab, TabElement } from "Element/Tabs";
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
import Text from "Element/Text";
import SendSats from "Element/SendSats";
import Nip05 from "Element/Nip05";
import Copy from "Element/Copy";
import ProfilePreview from "Element/ProfilePreview";
import ProfileImage from "Element/ProfileImage";
import FollowersList from "Element/FollowersList";
import BlockList from "Element/BlockList";
import MutedList from "Element/MutedList";
import FollowsList from "Element/FollowsList";
import IconButton from "Element/IconButton";
import { RootState } from "State/Store";
import { HexKey } from "Nostr";
import FollowsYou from "Element/FollowsYou";
import QrCode from "Element/QrCode";
import Modal from "Element/Modal";
import { ProxyImg } from "Element/ProxyImg";
import useHorizontalScroll from "Hooks/useHorizontalScroll";

import messages from "./messages";

const NOTES = 0;
const REACTIONS = 1;
const FOLLOWERS = 2;
const FOLLOWS = 3;
const ZAPS = 4;
const MUTED = 5;
const BLOCKED = 6;

export default function ProfilePage() {
  const { formatMessage } = useIntl();
  const params = useParams();
  const navigate = useNavigate();
  const id = useMemo(() => parseId(params.id!), [params]);
  const user = useUserProfile(id);
  const loggedOut = useSelector<RootState, boolean | undefined>(
    (s) => s.login.loggedOut
  );
  const loginPubKey = useSelector<RootState, HexKey | undefined>(
    (s) => s.login.publicKey
  );
  const follows = useSelector<RootState, HexKey[]>((s) => s.login.follows);
  const isMe = loginPubKey === id;
  const [showLnQr, setShowLnQr] = useState<boolean>(false);
  const [showProfileQr, setShowProfileQr] = useState<boolean>(false);
  const aboutText = user?.about || "";
  const about = Text({
    content: aboutText,
    tags: [],
    users: new Map(),
    creator: "",
  });
  const lnurl = extractLnAddress(user?.lud16 || user?.lud06 || "");
  const website_url =
    user?.website && !user.website.startsWith("http")
      ? "https://" + user.website
      : user?.website || "";
  const zapFeed = useZapsFeed(id);
  const zaps = useMemo(() => {
    const profileZaps = zapFeed.store.notes
      .map(parseZap)
      .filter((z) => z.valid && z.p === id && !z.e && z.zapper !== id);
    profileZaps.sort((a, b) => b.amount - a.amount);
    return profileZaps;
  }, [zapFeed.store, id]);
  const zapsTotal = zaps.reduce((acc, z) => acc + z.amount, 0);
  const horizontalScroll = useHorizontalScroll();
  const ProfileTab = {
    Notes: { text: formatMessage(messages.Notes), value: NOTES },
    Reactions: { text: formatMessage(messages.Reactions), value: REACTIONS },
    Followers: { text: formatMessage(messages.Followers), value: FOLLOWERS },
    Follows: { text: formatMessage(messages.Follows), value: FOLLOWS },
    Zaps: { text: formatMessage(messages.Zaps), value: ZAPS },
    Muted: { text: formatMessage(messages.Muted), value: MUTED },
    Blocked: { text: formatMessage(messages.Blocked), value: BLOCKED },
  };
  const [tab, setTab] = useState<Tab>(ProfileTab.Notes);

  useEffect(() => {
    setTab(ProfileTab.Notes);
  }, [params]);

  function username() {
    return (
      <div className="name">
        <h2>
          {user?.display_name || user?.name || "Nostrich"}
          <FollowsYou pubkey={id} />
        </h2>
        {user?.nip05 && <Nip05 nip05={user.nip05} pubkey={user.pubkey} />}
        <Copy text={params.id || ""} />
        {links()}
      </div>
    );
  }

  function links() {
    return (
      <div className="links">
        {user?.website && (
          <div className="website f-ellipsis">
            <span className="link-icon">
              <Link />
            </span>
            <a href={website_url} target="_blank" rel="noreferrer">
              {user.website}
            </a>
          </div>
        )}

        {lnurl && (
          <div className="lnurl f-ellipsis" onClick={() => setShowLnQr(true)}>
            <span className="link-icon">
              <Zap />
            </span>
            {lnurl}
          </div>
        )}

        <SendSats
          svc={lnurl}
          show={showLnQr}
          onClose={() => setShowLnQr(false)}
          author={id}
          target={user?.display_name || user?.name}
        />
      </div>
    );
  }

  function bio() {
    return (
      aboutText.length > 0 && (
        <>
          <div className="details">{about}</div>
        </>
      )
    );
  }

  function tabContent() {
    switch (tab.value) {
      case NOTES:
        return (
          <Timeline
            key={id}
            subject={{
              type: "pubkey",
              items: [id],
              discriminator: id.slice(0, 12),
            }}
            postsOnly={false}
            method={"TIME_RANGE"}
            ignoreModeration={true}
          />
        );
      case ZAPS: {
        return (
          <div className="main-content">
            <h4 className="zaps-total">
              <FormattedMessage
                {...messages.Sats}
                values={{ n: formatShort(zapsTotal) }}
              />
            </h4>
            {zaps.map((z) => (
              <ZapElement showZapped={false} zap={z} />
            ))}
          </div>
        );
      }

      case FOLLOWS: {
        if (isMe) {
          return (
            <div className="main-content">
              <h4>
                <FormattedMessage
                  {...messages.Following}
                  values={{ n: follows.length }}
                />
              </h4>
              {follows.map((a) => (
                <ProfilePreview
                  key={a}
                  pubkey={a.toLowerCase()}
                  options={{ about: false }}
                />
              ))}
            </div>
          );
        } else {
          return <FollowsList pubkey={id} />;
        }
      }
      case FOLLOWERS: {
        return <FollowersList pubkey={id} />;
      }
      case MUTED: {
        return isMe ? <BlockList variant="muted" /> : <MutedList pubkey={id} />;
      }
      case BLOCKED: {
        return isMe ? <BlockList variant="blocked" /> : null;
      }
    }
  }

  function avatar() {
    return (
      <div className="avatar-wrapper">
        <Avatar user={user} />
      </div>
    );
  }

  function renderIcons() {
    return (
      <div className="icon-actions">
        <IconButton onClick={() => setShowProfileQr(true)}>
          <Qr width={14} height={16} />
        </IconButton>
        {showProfileQr && (
          <Modal className="qr-modal" onClose={() => setShowProfileQr(false)}>
            <ProfileImage pubkey={id} />
            <QrCode
              data={`nostr:${hexToBech32("npub", id)}`}
              link={undefined}
              className="m10"
            />
          </Modal>
        )}
        {isMe ? (
          <>
            <LogoutButton />
            <button type="button" onClick={() => navigate("/settings")}>
              <FormattedMessage {...messages.Settings} />
            </button>
          </>
        ) : (
          <>
            {lnurl && (
              <IconButton onClick={() => setShowLnQr(true)}>
                <Zap width={14} height={16} />
              </IconButton>
            )}
            {!loggedOut && (
              <>
                <IconButton
                  onClick={() =>
                    navigate(`/messages/${hexToBech32("npub", id)}`)
                  }
                >
                  <Envelope width={16} height={13} />
                </IconButton>
              </>
            )}
          </>
        )}
      </div>
    );
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
    );
  }

  function renderTab(v: Tab) {
    return <TabElement t={v} tab={tab} setTab={setTab} />;
  }

  const w = window.document.querySelector(".page")?.clientWidth;
  return (
    <>
      <div className="profile flex">
        {user?.banner && (
          <ProxyImg
            alt="banner"
            className="banner"
            src={user.banner}
            size={w}
          />
        )}
        <div className="profile-wrapper flex">
          {avatar()}
          {userDetails()}
        </div>
      </div>
      <div className="tabs main-content" ref={horizontalScroll}>
        {[
          ProfileTab.Notes,
          ProfileTab.Followers,
          ProfileTab.Follows,
          ProfileTab.Zaps,
          ProfileTab.Muted,
        ].map(renderTab)}
        {isMe && renderTab(ProfileTab.Blocked)}
      </div>
      {tabContent()}
    </>
  );
}
