import { TaggedNostrEvent } from "@snort/system";
import { Fragment } from "react";

import Note from "@/Components/Event/EventComponent";
import { Divider } from "@/Components/Event/Thread/Divider";
import { TierTwo } from "@/Components/Event/Thread/TierTwo";
import { getReplies } from "@/Components/Event/Thread/util";

export interface SubthreadProps {
  isLastSubthread?: boolean;
  active: string;
  notes: readonly TaggedNostrEvent[];
  chains: Map<string, Array<TaggedNostrEvent>>;
  onNavigate: (e: TaggedNostrEvent) => void;
}

export const Subthread = ({ active, notes, chains, onNavigate }: SubthreadProps) => {
  const renderSubthread = (a: TaggedNostrEvent, idx: number) => {
    const isLastSubthread = idx === notes.length - 1;
    const replies = getReplies(a.id, chains);
    return (
      <Fragment key={a.id}>
        <div
          className={`subthread-container relative ${replies.length > 0 ? "subthread-multi before:content-[''] before:absolute before:left-[40px] before:top-12 before:border-l before:border-border before:h-full before:-z-10" : ""}`}>
          <Divider />
          <Note
            highlight={active === a.id}
            className={`thread-note border-0 ${isLastSubthread && replies.length === 0 ? "is-last-note" : ""}`}
            data={a}
            key={a.id}
            onClick={onNavigate}
            threadChains={chains}
            waitUntilInView={idx > 5}
          />
          <div className="line-container"></div>
        </div>
        {replies.length > 0 && (
          <TierTwo
            active={active}
            isLastSubthread={isLastSubthread}
            notes={replies}
            chains={chains}
            onNavigate={onNavigate}
          />
        )}
      </Fragment>
    );
  };

  return <div className="subthread">{notes.map(renderSubthread)}</div>;
};
