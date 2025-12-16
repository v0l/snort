import type { TaggedNostrEvent } from "@snort/system";
import { Fragment, useMemo, useState } from "react";
import { FormattedMessage, type MessageDescriptor, useIntl } from "react-intl";

import Icon from "@/Components/Icons/Icon";
import Modal from "@/Components/Modal/Modal";
import { useNoteContext } from "@/Components/Event/Note/NoteContext";
import TabSelectors, { type Tab } from "@/Components/TabSelectors/TabSelectors";
import ProfileImage from "@/Components/User/ProfileImage";
import ZapAmount from "@/Components/zap-amount";
import useWoT from "@/Hooks/useWoT";

import messages from "../../messages";

interface ReactionsModalProps {
  onClose(): void;
  initialTab?: number;
}

const ReactionsModal = ({ onClose, initialTab = 0 }: ReactionsModalProps) => {
  const { formatMessage } = useIntl();
  const { reactions } = useNoteContext();

  const { reactions: reactionGroups, zaps, reposts } = reactions;
  const { positive, negative } = reactionGroups;

  const { sortEvents } = useWoT();

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
    <Fragment key={ev.id}>
      <div className="mx-auto">
        <Icon name={icon} size={size} className={iconClass} />
      </div>
      <ProfileImage pubkey={ev.pubkey} showProfileCard={true} />
    </Fragment>
  );

  return (
    <Modal id="reactions" onClose={onClose}>
      <div className="text-lg font-semibold mb-2">
        <FormattedMessage defaultMessage="Reactions ({n})" values={{ n: total }} />
      </div>
      <TabSelectors tabs={tabs} tab={tab} setTab={setTab} />
      <div className="h-[50dvh] overflow-y-auto">
        <div className="grid grid-cols-[90px_auto] gap-y-2 items-center py-2" key={tab.value}>
          {tab.value === 0 && likes.map(ev => renderReactionItem(ev, "heart-solid", "text-heart"))}
          {tab.value === 1 &&
            zaps.map(
              z =>
                z.sender && (
                  <Fragment key={z.id}>
                    <ZapAmount n={z.amount} />
                    <ProfileImage
                      showProfileCard={true}
                      pubkey={z.sender}
                      subHeader={<div title={z.content}>{z.content}</div>}
                      link={z.anonZap ? "" : undefined}
                      overrideUsername={z.anonZap ? formatMessage({ defaultMessage: "Anonymous" }) : undefined}
                    />
                  </Fragment>
                ),
            )}
          {tab.value === 2 && sortedReposts.map(ev => renderReactionItem(ev, "repost", "text-repost", 16))}
          {tab.value === 3 && dislikes.map(ev => renderReactionItem(ev, "dislike"))}
        </div>
      </div>
    </Modal>
  );
};

export default ReactionsModal;
