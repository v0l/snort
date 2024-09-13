import "./ReactionsModal.css";

import { NostrLink, socialGraphInstance, TaggedNostrEvent } from "@snort/system";
import { useEventReactions, useReactions } from "@snort/system-react";
import { useMemo, useState } from "react";
import { FormattedMessage, MessageDescriptor, useIntl } from "react-intl";

import CloseButton from "@/Components/Button/CloseButton";
import Icon from "@/Components/Icons/Icon";
import Modal from "@/Components/Modal/Modal";
import TabSelectors, { Tab } from "@/Components/TabSelectors/TabSelectors";
import ProfileImage from "@/Components/User/ProfileImage";
import ZapAmount from "@/Components/zap-amount";

import messages from "../../messages";

interface ReactionsModalProps {
  onClose(): void;
  event: TaggedNostrEvent;
  initialTab?: number;
}

const ReactionsModal = ({ onClose, event, initialTab = 0 }: ReactionsModalProps) => {
  const { formatMessage } = useIntl();

  const link = NostrLink.fromEvent(event);

  const related = useReactions("reactions", link, undefined, false);
  const { reactions, zaps, reposts } = useEventReactions(link, related);
  const { positive, negative } = reactions;

  const sortEvents = (events: Array<TaggedNostrEvent>) =>
    events.sort(
      (a, b) => socialGraphInstance.getFollowDistance(a.pubkey) - socialGraphInstance.getFollowDistance(b.pubkey),
    );

  const likes = useMemo(() => sortEvents([...positive]), [positive]);
  const dislikes = useMemo(() => sortEvents([...negative]), [negative]);
  const sortedReposts = useMemo(() => sortEvents([...reposts]), [reposts]);

  const total = positive.length + negative.length + zaps.length + reposts.length;

  const createTab = (message: MessageDescriptor, count: number, value: number, disabled = false) =>
    ({
      text: formatMessage(message, { n: count }),
      value,
      disabled,
    }) as Tab;

  const tabs = useMemo(() => {
    const baseTabs = [
      createTab(messages.Likes, likes.length, 0),
      createTab(messages.Zaps, zaps.length, 1, zaps.length === 0),
      createTab(messages.Reposts, reposts.length, 2, reposts.length === 0),
    ];

    return dislikes.length !== 0 ? baseTabs.concat(createTab(messages.Dislikes, dislikes.length, 3)) : baseTabs;
  }, [likes.length, zaps.length, reposts.length, dislikes.length, formatMessage]);

  const [tab, setTab] = useState(tabs[initialTab]);

  const renderReactionItem = (ev: TaggedNostrEvent, icon: string, iconClass?: string, size?: number) => (
    <div key={ev.id} className="reactions-item">
      <div className="reaction-icon">
        <Icon name={icon} size={size} className={iconClass} />
      </div>
      <ProfileImage pubkey={ev.pubkey} showProfileCard={true} />
    </div>
  );

  return (
    <Modal id="reactions" className="reactions-modal" onClose={onClose}>
      <CloseButton onClick={onClose} className="absolute right-4 top-3" />
      <div className="reactions-header">
        <h2>
          <FormattedMessage {...messages.ReactionsCount} values={{ n: total }} />
        </h2>
      </div>
      <TabSelectors tabs={tabs} tab={tab} setTab={setTab} />
      <div className="reactions-body" key={tab.value}>
        {tab.value === 0 && likes.map(ev => renderReactionItem(ev, "heart-solid", "text-heart"))}
        {tab.value === 1 &&
          zaps.map(
            z =>
              z.sender && (
                <div key={z.id} className="reactions-item">
                  <ZapAmount n={z.amount} />
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
        {tab.value === 2 && sortedReposts.map(ev => renderReactionItem(ev, "repost", "text-repost", 16))}
        {tab.value === 3 && dislikes.map(ev => renderReactionItem(ev, "dislike"))}
      </div>
    </Modal>
  );
};

export default ReactionsModal;
