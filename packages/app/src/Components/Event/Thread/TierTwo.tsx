import { TaggedNostrEvent } from "@snort/system";

import { SubthreadProps } from "@/Components/Event/Thread/Subthread";
import { ThreadNote } from "@/Components/Event/Thread/ThreadNote";

export const TierTwo = ({ active, isLastSubthread, notes, chains, onNavigate }: SubthreadProps) => {
  const [first, ...rest] = notes;

  return (
    <>
      <ThreadNote
        active={active}
        onNavigate={onNavigate}
        note={first}
        chains={chains}
        isLastSubthread={isLastSubthread}
        isLast={rest.length === 0}
        idx={0}
      />

      {rest.map((r: TaggedNostrEvent, idx: number) => {
        const lastReply = idx === rest.length - 1;
        return (
          <ThreadNote
            key={r.id}
            active={active}
            onNavigate={onNavigate}
            note={r}
            chains={chains}
            isLastSubthread={isLastSubthread}
            isLast={lastReply}
            idx={idx}
          />
        );
      })}
    </>
  );
};
