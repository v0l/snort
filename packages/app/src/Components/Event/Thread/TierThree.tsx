import { TaggedNostrEvent } from "@snort/system";
import classNames from "classnames";

import Note from "@/Components/Event/EventComponent";
import { Divider } from "@/Components/Event/Thread/Divider";
import { SubthreadProps } from "@/Components/Event/Thread/Subthread";
import { getReplies } from "@/Components/Event/Thread/util";

export const TierThree = ({ active, isLastSubthread, notes, chains, onNavigate }: SubthreadProps) => {
  const [first, ...rest] = notes;
  const replies = getReplies(first.id, chains);
  const hasMultipleNotes = rest.length > 0 || replies.length > 0;
  const isLast = replies.length === 0 && rest.length === 0;
  return (
    <>
      <div
        className={classNames("subthread-container", {
          "subthread-multi": hasMultipleNotes,
          "subthread-last": isLast,
          "subthread-mid": !isLast,
        })}>
        <Divider variant="small" />
        <Note
          highlight={active === first.id}
          className={classNames("thread-note", { "is-last-note": isLastSubthread && isLast })}
          data={first}
          key={first.id}
          threadChains={chains}
          waitUntilInView={true}
        />
        <div className="line-container"></div>
      </div>

      {replies.length > 0 && (
        <TierThree
          active={active}
          isLastSubthread={isLastSubthread}
          notes={replies}
          chains={chains}
          onNavigate={onNavigate}
        />
      )}

      {rest.map((r: TaggedNostrEvent, idx: number) => {
        const lastReply = idx === rest.length - 1;
        const lastNote = isLastSubthread && lastReply;
        return (
          <div
            key={r.id}
            className={classNames("subthread-container", {
              "subthread-multi": !lastReply,
              "subthread-last": !lastReply,
              "subthread-mid": lastReply,
            })}>
            <Divider variant="small" />
            <Note
              className={classNames("thread-note", { "is-last-note": lastNote })}
              highlight={active === r.id}
              data={r}
              key={r.id}
              onClick={onNavigate}
              threadChains={chains}
              waitUntilInView={idx > 5}
            />
            <div className="line-container"></div>
          </div>
        );
      })}
    </>
  );
};
