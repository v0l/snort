import "./Reactions.css";

import { NostrLink, socialGraphInstance, TaggedNostrEvent } from "@snort/system";
import { useEventReactions, useReactions } from "@snort/system-react";
import { useEffect, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import CloseButton from "@/Components/Button/CloseButton";
import Icon from "@/Components/Icons/Icon";
import Modal from "@/Components/Modal/Modal";
import Tabs from "@/Components/Tabs/Tabs";
import ProfileImage from "@/Components/User/ProfileImage";
import { formatShort } from "@/Utils/Number";

import messages from "../messages";

interface ReactionsModalProps {
  show: boolean;
  setShow(b: boolean): void;
  event: TaggedNostrEvent;
}

const ReactionsModal = ({ show, setShow, event }: ReactionsModalProps) => {
  const { formatMessage } = useIntl();
  const onClose = () => setShow(false);

  const link = NostrLink.fromEvent(event);

  const related = useReactions(link.id + "related", [link], undefined, false);
  const { reactions, zaps, reposts } = useEventReactions(link, related.data ?? []);
  const { positive, negative } = reactions;

  const sortEvents = events =>
    events.sort(
      (a, b) => socialGraphInstance.getFollowDistance(a.pubkey) - socialGraphInstance.getFollowDistance(b.pubkey),
    );

  const likes = useMemo(() => sortEvents([...positive]), [positive]);
  const dislikes = useMemo(() => sortEvents([...negative]), [negative]);
  const sortedReposts = useMemo(() => sortEvents([...reposts]), [reposts]);

  const total = positive.length + negative.length + zaps.length + reposts.length;

  const createTab = (message, count, value, disabled = false) => ({
    text: formatMessage(message, { n: count }),
    value,
    disabled,
  });

  const tabs = useMemo(() => {
    const baseTabs = [
      createTab(messages.Likes, likes.length, 0),
      createTab(messages.Zaps, zaps.length, 1, zaps.length === 0),
      createTab(messages.Reposts, reposts.length, 2, reposts.length === 0),
    ];

    return dislikes.length !== 0 ? baseTabs.concat(createTab(messages.Dislikes, dislikes.length, 3)) : baseTabs;
  }, [likes.length, zaps.length, reposts.length, dislikes.length, formatMessage]);

  const [tab, setTab] = useState(tabs[0]);

  useEffect(() => {
    if (!show) {
      setTab(tabs[0]);
    }
  }, [show, tabs]);

  const renderReactionItem = (ev, icon, size) => (
    <div key={ev.id} className="reactions-item">
      <div className="reaction-icon">
        <Icon name={icon} size={size} />
      </div>
      <ProfileImage pubkey={ev.pubkey} showProfileCard={true} />
    </div>
  );

  return show ? (
    <Modal id="reactions" className="reactions-modal" onClose={onClose}>
      <CloseButton onClick={onClose} className="absolute right-4 top-3" />
      <div className="reactions-header">
        <h2>
          <FormattedMessage {...messages.ReactionsCount} values={{ n: total }} />
        </h2>
      </div>
      <Tabs tabs={tabs} tab={tab} setTab={setTab} />
      <div className="reactions-body" key={tab.value}>
        {tab.value === 0 && likes.map(ev => renderReactionItem(ev, "heart"))}
        {tab.value === 1 &&
          zaps.map(
            z =>
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
              ),
          )}
        {tab.value === 2 && sortedReposts.map(ev => renderReactionItem(ev, "repost", 16))}
        {tab.value === 3 && dislikes.map(ev => renderReactionItem(ev, "dislike"))}
      </div>
    </Modal>
  ) : null;
};

export default ReactionsModal;
