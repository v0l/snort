import { TaggedNostrEvent } from "@snort/system";
import classNames from "classnames";
import { useState } from "react";
import { useIntl } from "react-intl";

import Collapsed from "@/Components/Collapsed";
import Note from "@/Components/Event/EventComponent";
import { Divider } from "@/Components/Event/Thread/Divider";
import { SubthreadProps } from "@/Components/Event/Thread/Subthread";
import { TierThree } from "@/Components/Event/Thread/TierThree";
import { getReplies } from "@/Components/Event/Thread/util";
import messages from "@/Components/messages";

interface ThreadNoteProps extends Omit<SubthreadProps, "notes"> {
  note: TaggedNostrEvent;
  isLast: boolean;
  idx: number;
}

export const ThreadNote = ({ active, note, isLast, isLastSubthread, chains, onNavigate, idx }: ThreadNoteProps) => {
  const { formatMessage } = useIntl();
  const replies = getReplies(note.id, chains);
  const activeInReplies = replies.map(r => r.id).includes(active);
  const [collapsed, setCollapsed] = useState(!activeInReplies);
  const hasMultipleNotes = replies.length > 1;
  const isLastVisibleNote = isLastSubthread && isLast && !hasMultipleNotes;
  const className = classNames(
    "subthread-container",
    isLast && collapsed ? "subthread-last" : "subthread-multi subthread-mid",
  );
  return (
    <>
      <div className={className}>
        <Divider variant="small" />
        <Note
          highlight={active === note.id}
          className={classNames("thread-note", { "is-last-note": isLastVisibleNote })}
          data={note}
          key={note.id}
          onClick={onNavigate}
          threadChains={chains}
          waitUntilInView={idx > 5}
        />
        <div className="line-container"></div>
      </div>
      {replies.length > 0 && (
        <Collapsed text={formatMessage(messages.ShowReplies)} collapsed={collapsed} setCollapsed={setCollapsed}>
          <TierThree
            active={active}
            isLastSubthread={isLastSubthread}
            notes={replies}
            chains={chains}
            onNavigate={onNavigate}
          />
        </Collapsed>
      )}
    </>
  );
};
