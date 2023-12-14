import "./Reactions.css";

import { useState, useMemo, useEffect } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import { TaggedNostrEvent, ParsedZap } from "@snort/system";

import { formatShort } from "@/Number";
import Icon from "@/Icons/Icon";
import { Tab } from "@/Element/Tabs";
import ProfileImage from "@/Element/User/ProfileImage";
import Tabs from "@/Element/Tabs";
import Modal from "@/Element/Modal";

import messages from "../messages";

interface ReactionsProps {
  show: boolean;
  setShow(b: boolean): void;
  positive: TaggedNostrEvent[];
  negative: TaggedNostrEvent[];
  reposts: TaggedNostrEvent[];
  zaps: ParsedZap[];
}

const Reactions = ({ show, setShow, positive, negative, reposts, zaps }: ReactionsProps) => {
  const { formatMessage } = useIntl();
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
  const total = positive.length + negative.length + zaps.length + reposts.length;
  const defaultTabs: Tab[] = [
    {
      text: formatMessage(messages.Likes, { n: likes.length }),
      value: 0,
    },
    {
      text: formatMessage(messages.Zaps, { n: zaps.length }),
      value: 1,
      disabled: zaps.length === 0,
    },
    {
      text: formatMessage(messages.Reposts, { n: reposts.length }),
      value: 2,
      disabled: reposts.length === 0,
    },
  ];
  const tabs = defaultTabs.concat(
    dislikes.length !== 0
      ? [
          {
            text: formatMessage(messages.Dislikes, { n: dislikes.length }),
            value: 3,
          },
        ]
      : [],
  );

  const [tab, setTab] = useState(tabs[0]);

  useEffect(() => {
    if (!show) {
      setTab(tabs[0]);
    }
  }, [show]);

  return show ? (
    <Modal id="reactions" className="reactions-modal" onClose={onClose}>
      <div className="close" onClick={onClose}>
        <Icon name="close" />
      </div>
      <div className="reactions-header">
        <h2>
          <FormattedMessage {...messages.ReactionsCount} values={{ n: total }} />
        </h2>
      </div>
      <Tabs tabs={tabs} tab={tab} setTab={setTab} />
      <div className="reactions-body" key={tab.value}>
        {tab.value === 0 &&
          likes.map(ev => {
            return (
              <div key={ev.id} className="reactions-item">
                <div className="reaction-icon">{ev.content === "+" ? <Icon name="heart" /> : ev.content}</div>
                <ProfileImage pubkey={ev.pubkey} showProfileCard={true} />
              </div>
            );
          })}
        {tab.value === 1 &&
          zaps.map(z => {
            return (
              z.sender && (
                <div key={z.id} className="reactions-item">
                  <div className="zap-reaction-icon">
                    <Icon name="zap" size={20} />
                    <span className="zap-amount">{formatShort(z.amount)}</span>
                  </div>
                  <ProfileImage
                    showProfileCard={true}
                    pubkey={z.anonZap ? "" : z.sender}
                    subHeader={<div title={z.content}>{z.content}</div>}
                    link={z.anonZap ? "" : undefined}
                    overrideUsername={
                      z.anonZap ? formatMessage({ defaultMessage: "Anonymous", id: "LXxsbk" }) : undefined
                    }
                  />
                </div>
              )
            );
          })}
        {tab.value === 2 &&
          reposts.map(ev => {
            return (
              <div key={ev.id} className="reactions-item">
                <div className="reaction-icon">
                  <Icon name="repost" size={16} />
                </div>
                <ProfileImage pubkey={ev.pubkey} showProfileCard={true} />
              </div>
            );
          })}
        {tab.value === 3 &&
          dislikes.map(ev => {
            return (
              <div key={ev.id} className="reactions-item f-ellipsis">
                <div className="reaction-icon">
                  <Icon name="dislike" />
                </div>
                <ProfileImage pubkey={ev.pubkey} showProfileCard={true} />
              </div>
            );
          })}
      </div>
    </Modal>
  ) : null;
};

export default Reactions;
