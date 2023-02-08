import "./Reactions.css";

import { useState, useMemo, useEffect } from "react";
import { HexKey, TaggedRawEvent } from "Nostr";

import { formatShort } from "Number";
import Dislike from "Icons/Dislike";
import Heart from "Icons/Heart";
import ZapIcon from "Icons/Zap";
import { Tab } from "Element/Tabs";
import { ParsedZap } from "Element/Zap";
import ProfileImage from "Element/ProfileImage";
import FollowButton from "Element/FollowButton";
import Tabs from "Element/Tabs";
import Close from "Icons/Close";
import Modal from "Element/Modal";

interface ReactionsProps {
  show: boolean;
  setShow(b: boolean): void;
  positive: TaggedRawEvent[];
  negative: TaggedRawEvent[];
  reposts: TaggedRawEvent[];
  zaps: ParsedZap[];
}

const Reactions = ({
  show,
  setShow,
  positive,
  negative,
  reposts,
  zaps,
}: ReactionsProps) => {
  const onClose = () => setShow(false);
  const likes = useMemo(() => {
    const sorted = [...positive];
    sorted.sort((a, b) => b.created_at - a.created_at);
    return sorted;
  }, [positive]);
  const dislikes = useMemo(() => {
    const sorted = [...negative];
    sorted.sort((a, b) => b.created_at - a.created_at);
    return sorted;
  }, [negative]);
  const total =
    positive.length + negative.length + zaps.length + reposts.length;
  const defaultTabs: Tab[] = [
    {
      text: `Likes (${likes.length})`,
      value: 0,
    },
    {
      text: `Zaps (${zaps.length})`,
      value: 1,
      disabled: zaps.length === 0,
    },
    {
      text: `Reposts (${reposts.length})`,
      value: 2,
      disabled: reposts.length === 0,
    },
  ];
  const tabs = defaultTabs.concat(
    dislikes.length !== 0
      ? [{ text: `Dislikes (${dislikes.length})`, value: 3 }]
      : []
  );

  const [tab, setTab] = useState(tabs[0]);

  useEffect(() => {
    if (!show) {
      setTab(tabs[0]);
    }
  }, [show]);

  return show ? (
    <Modal className="reactions-modal" onClose={onClose}>
      <div className="reactions-view">
        <div className="close" onClick={onClose}>
          <Close />
        </div>
        <div className="reactions-header">
          <h2>Reactions ({total})</h2>
        </div>
        <Tabs tabs={tabs} tab={tab} setTab={setTab} />
        <div className="body" key={tab.value}>
          {tab.value === 0 &&
            likes.map((ev) => {
              return (
                <div key={ev.id} className="reactions-item">
                  <div className="reaction-icon">
                    {ev.content === "+" ? (
                      <Heart width={20} height={18} />
                    ) : (
                      ev.content
                    )}
                  </div>
                  <ProfileImage pubkey={ev.pubkey} />
                  <FollowButton pubkey={ev.pubkey} />
                </div>
              );
            })}
          {tab.value === 1 &&
            zaps.map((z) => {
              return (
                <div key={z.id} className="reactions-item">
                  <div className="zap-reaction-icon">
                    <ZapIcon width={17} height={20} />
                    <span className="zap-amount">{formatShort(z.amount)}</span>
                  </div>
                  <ProfileImage
                    pubkey={z.zapper!}
                    subHeader={<>{z.content}</>}
                  />
                  <FollowButton pubkey={z.zapper!} />
                </div>
              );
            })}
          {tab.value === 2 &&
            reposts.map((ev) => {
              return (
                <div key={ev.id} className="reactions-item">
                  <div className="reaction-icon">
                    <Heart width={20} height={18} />
                  </div>
                  <ProfileImage pubkey={ev.pubkey} />
                  <FollowButton pubkey={ev.pubkey} />
                </div>
              );
            })}
          {tab.value === 3 &&
            dislikes.map((ev) => {
              return (
                <div key={ev.id} className="reactions-item">
                  <div className="reaction-icon">
                    <Dislike width={20} height={18} />
                  </div>
                  <ProfileImage pubkey={ev.pubkey} />
                  <FollowButton pubkey={ev.pubkey} />
                </div>
              );
            })}
        </div>
      </div>
    </Modal>
  ) : null;
};

export default Reactions;
