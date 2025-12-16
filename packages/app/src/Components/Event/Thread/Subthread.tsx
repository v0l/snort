import { EventExt, type TaggedNostrEvent } from "@snort/system";

import Note from "@/Components/Event/EventComponent";
import { getReplies } from "@/Components/Event/Thread/util";

export interface SubthreadProps {
  isLastSubthread?: boolean;
  active: string;
  notes: readonly TaggedNostrEvent[];
  allNotes: readonly TaggedNostrEvent[];
  chains: Map<string, Array<string>>;
  onNavigate: (e: TaggedNostrEvent) => void;
}

export const Subthread = ({ active, notes, allNotes, chains, onNavigate }: SubthreadProps) => {
  const renderNote = (
    note: TaggedNostrEvent,
    idx: number,
    siblings: readonly TaggedNostrEvent[],
    depth: number,
    parentContinues: boolean,
  ): React.ReactNode => {
    const noteKey = EventExt.keyOf(note);
    const replies = getReplies(noteKey, allNotes, chains);
    const hasReplies = replies.length > 0;
    const isLast = idx === siblings.length - 1;

    // Pass to children: only pass true if this note isn't last (has siblings after it)
    const continuesAfterThisNote = !isLast;

    // Root level (depth 0): only show bottomLine to connect to nested replies
    // Depth 1 (direct replies to root): show bottomLine if has replies OR not last
    // Depth > 1 (nested replies): show bottomLine if has replies OR not last OR parent continues
    const threadLines =
      depth === 0
        ? hasReplies
          ? {
              inset: "left-9",
              topLine: false,
              bottomLine: true,
            }
          : undefined
        : {
            inset: "left-9",
            topLine: true,
            bottomLine: hasReplies || !isLast || (depth > 1 && parentContinues),
          };

    return (
      <>
        <Note
          highlight={active === noteKey}
          inset={`ml-14`}
          data={note}
          key={noteKey}
          onClick={onNavigate}
          threadChains={chains}
          waitUntilInView={idx > 5}
          options={{
            threadLines,
          }}
        />
        {replies.map((reply, y) => renderNote(reply, y, replies, depth + 1, continuesAfterThisNote))}
      </>
    );
  };

  return <div>{notes.map((note, idx) => renderNote(note, idx, notes, 0, false))}</div>;
};
