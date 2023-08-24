import "./Thread.css";
import { useMemo, useState, ReactNode } from "react";
import { useIntl } from "react-intl";
import { useNavigate, useLocation, Link, useParams } from "react-router-dom";
import {
  TaggedNostrEvent,
  u256,
  EventKind,
  NostrPrefix,
  EventExt,
  Thread as ThreadInfo,
  parseNostrLink,
} from "@snort/system";

import { eventLink, unwrap, getReactions, getAllReactions, findTag } from "SnortUtils";
import BackButton from "Element/BackButton";
import Note from "Element/Note";
import NoteGhost from "Element/NoteGhost";
import Collapsed from "Element/Collapsed";
import useThreadFeed from "Feed/ThreadFeed";

import messages from "./messages";

interface DividerProps {
  variant?: "regular" | "small";
}

const Divider = ({ variant = "regular" }: DividerProps) => {
  const className = variant === "small" ? "divider divider-small" : "divider";
  return (
    <div className="divider-container">
      <div className={className}></div>
    </div>
  );
};

interface SubthreadProps {
  isLastSubthread?: boolean;
  active: u256;
  notes: readonly TaggedNostrEvent[];
  related: readonly TaggedNostrEvent[];
  chains: Map<u256, Array<TaggedNostrEvent>>;
  onNavigate: (e: TaggedNostrEvent) => void;
}

const Subthread = ({ active, notes, related, chains, onNavigate }: SubthreadProps) => {
  const renderSubthread = (a: TaggedNostrEvent, idx: number) => {
    const isLastSubthread = idx === notes.length - 1;
    const replies = getReplies(a.id, chains);
    return (
      <>
        <div className={`subthread-container ${replies.length > 0 ? "subthread-multi" : ""}`}>
          <Divider />
          <Note
            highlight={active === a.id}
            className={`thread-note ${isLastSubthread && replies.length === 0 ? "is-last-note" : ""}`}
            data={a}
            key={a.id}
            related={related}
            onClick={onNavigate}
          />
          <div className="line-container"></div>
        </div>
        {replies.length > 0 && (
          <TierTwo
            active={active}
            isLastSubthread={isLastSubthread}
            notes={replies}
            related={related}
            chains={chains}
            onNavigate={onNavigate}
          />
        )}
      </>
    );
  };

  return <div className="subthread">{notes.map(renderSubthread)}</div>;
};

interface ThreadNoteProps extends Omit<SubthreadProps, "notes"> {
  note: TaggedNostrEvent;
  isLast: boolean;
}

const ThreadNote = ({ active, note, isLast, isLastSubthread, related, chains, onNavigate }: ThreadNoteProps) => {
  const { formatMessage } = useIntl();
  const replies = getReplies(note.id, chains);
  const activeInReplies = replies.map(r => r.id).includes(active);
  const [collapsed, setCollapsed] = useState(!activeInReplies);
  const hasMultipleNotes = replies.length > 1;
  const isLastVisibleNote = isLastSubthread && isLast && !hasMultipleNotes;
  const className = `subthread-container ${isLast && collapsed ? "subthread-last" : "subthread-multi subthread-mid"}`;
  return (
    <>
      <div className={className}>
        <Divider variant="small" />
        <Note
          highlight={active === note.id}
          className={`thread-note ${isLastVisibleNote ? "is-last-note" : ""}`}
          data={note}
          key={note.id}
          related={related}
          onClick={onNavigate}
        />
        <div className="line-container"></div>
      </div>
      {replies.length > 0 && (
        <Collapsed text={formatMessage(messages.ShowReplies)} collapsed={collapsed} setCollapsed={setCollapsed}>
          <TierThree
            active={active}
            isLastSubthread={isLastSubthread}
            notes={replies}
            related={related}
            chains={chains}
            onNavigate={onNavigate}
          />
        </Collapsed>
      )}
    </>
  );
};

const TierTwo = ({ active, isLastSubthread, notes, related, chains, onNavigate }: SubthreadProps) => {
  const [first, ...rest] = notes;

  return (
    <>
      <ThreadNote
        active={active}
        onNavigate={onNavigate}
        note={first}
        chains={chains}
        related={related}
        isLastSubthread={isLastSubthread}
        isLast={rest.length === 0}
      />

      {rest.map((r: TaggedNostrEvent, idx: number) => {
        const lastReply = idx === rest.length - 1;
        return (
          <ThreadNote
            active={active}
            onNavigate={onNavigate}
            note={r}
            chains={chains}
            related={related}
            isLastSubthread={isLastSubthread}
            isLast={lastReply}
          />
        );
      })}
    </>
  );
};

const TierThree = ({ active, isLastSubthread, notes, related, chains, onNavigate }: SubthreadProps) => {
  const [first, ...rest] = notes;
  const replies = getReplies(first.id, chains);
  const hasMultipleNotes = rest.length > 0 || replies.length > 0;
  const isLast = replies.length === 0 && rest.length === 0;
  return (
    <>
      <div
        className={`subthread-container ${hasMultipleNotes ? "subthread-multi" : ""} ${
          isLast ? "subthread-last" : "subthread-mid"
        }`}>
        <Divider variant="small" />
        <Note
          highlight={active === first.id}
          className={`thread-note ${isLastSubthread && isLast ? "is-last-note" : ""}`}
          data={first}
          key={first.id}
          related={related}
        />
        <div className="line-container"></div>
      </div>

      {replies.length > 0 && (
        <TierThree
          active={active}
          isLastSubthread={isLastSubthread}
          notes={replies}
          related={related}
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
            className={`subthread-container ${lastReply ? "" : "subthread-multi"} ${
              lastReply ? "subthread-last" : "subthread-mid"
            }`}>
            <Divider variant="small" />
            <Note
              className={`thread-note ${lastNote ? "is-last-note" : ""}`}
              highlight={active === r.id}
              data={r}
              key={r.id}
              related={related}
              onClick={onNavigate}
            />
            <div className="line-container"></div>
          </div>
        );
      })}
    </>
  );
};

export default function Thread() {
  const params = useParams();
  const location = useLocation();

  const link = parseNostrLink(params.id ?? "", NostrPrefix.Note);
  const thread = useThreadFeed(link);

  const [currentId, setCurrentId] = useState(link.id);

  const navigate = useNavigate();
  const isSingleNote = thread.data?.filter(a => a.kind === EventKind.TextNote).length === 1;
  const { formatMessage } = useIntl();

  function navigateThread(e: TaggedNostrEvent) {
    setCurrentId(e.id);
    //const link = encodeTLV(e.id, NostrPrefix.Event, e.relays);
  }

  const chains = useMemo(() => {
    const chains = new Map<u256, Array<TaggedNostrEvent>>();
    if (thread.data) {
      thread.data
        ?.filter(a => a.kind === EventKind.TextNote)
        .sort((a, b) => b.created_at - a.created_at)
        .forEach(v => {
          const t = EventExt.extractThread(v);
          let replyTo = t?.replyTo?.value ?? t?.root?.value;
          if (t?.root?.key === "a" && t?.root?.value) {
            const parsed = t.root.value.split(":");
            replyTo = thread.data?.find(
              a => a.kind === Number(parsed[0]) && a.pubkey === parsed[1] && findTag(a, "d") === parsed[2]
            )?.id;
          }
          if (replyTo) {
            if (!chains.has(replyTo)) {
              chains.set(replyTo, [v]);
            } else {
              unwrap(chains.get(replyTo)).push(v);
            }
          }
        });
    }
    return chains;
  }, [thread.data]);

  // Root is the parent of the current note or the current note if its a root note or the root of the thread
  const root = useMemo(() => {
    const currentNote =
      thread.data?.find(
        ne =>
          ne.id === currentId ||
          (link.type === NostrPrefix.Address && findTag(ne, "d") === currentId && ne.pubkey === link.author)
      ) ?? (location.state && "sig" in location.state ? (location.state as TaggedNostrEvent) : undefined);
    if (currentNote) {
      const currentThread = EventExt.extractThread(currentNote);
      const isRoot = (ne?: ThreadInfo) => ne === undefined;

      if (isRoot(currentThread)) {
        return currentNote;
      }
      const replyTo = currentThread?.replyTo ?? currentThread?.root;

      // sometimes the root event ID is missing, and we can only take the happy path if the root event ID exists
      if (replyTo) {
        if (replyTo.key === "a" && replyTo.value) {
          const parsed = replyTo.value.split(":");
          return thread.data?.find(
            a => a.kind === Number(parsed[0]) && a.pubkey === parsed[1] && findTag(a, "d") === parsed[2]
          );
        }
        if (replyTo.value) {
          return thread.data?.find(a => a.id === replyTo.value);
        }
      }

      const possibleRoots = thread.data?.filter(a => {
        const thread = EventExt.extractThread(a);
        return isRoot(thread);
      });
      if (possibleRoots) {
        // worst case we need to check every possible root to see which one contains the current note as a child
        for (const ne of possibleRoots) {
          const children = chains.get(ne.id) ?? [];

          if (children.find(ne => ne.id === currentId)) {
            return ne;
          }
        }
      }
    }
  }, [thread.data, currentId, location]);

  const parent = useMemo(() => {
    if (root) {
      const currentThread = EventExt.extractThread(root);
      return (
        currentThread?.replyTo?.value ??
        currentThread?.root?.value ??
        (currentThread?.root?.key === "a" && currentThread.root?.value)
      );
    }
  }, [root]);

  const brokenChains = Array.from(chains?.keys()).filter(a => !thread.data?.some(b => b.id === a));

  function renderRoot(note: TaggedNostrEvent) {
    const className = `thread-root${isSingleNote ? " thread-root-single" : ""}`;
    if (note) {
      return (
        <Note
          className={className}
          key={note.id}
          data={note}
          related={getReactions(thread.data, note.id)}
          options={{ showReactionsLink: true }}
          onClick={navigateThread}
        />
      );
    } else {
      return <NoteGhost className={className}>Loading thread root.. ({thread.data?.length} notes loaded)</NoteGhost>;
    }
  }

  function renderChain(from: u256): ReactNode {
    if (!from || !chains) {
      return;
    }
    const replies = chains.get(from);
    if (replies && currentId) {
      return (
        <Subthread
          active={currentId}
          notes={replies}
          related={getAllReactions(
            thread.data,
            replies.map(a => a.id)
          )}
          chains={chains}
          onNavigate={navigateThread}
        />
      );
    }
  }

  function goBack() {
    if (parent) {
      setCurrentId(parent);
    } else {
      navigate(-1);
    }
  }

  const parentText = formatMessage({
    defaultMessage: "Parent",
    description: "Link to parent note in thread",
  });
  const backText = formatMessage({
    defaultMessage: "Back",
    description: "Navigate back button on threads view",
  });
  return (
    <>
      <div className="main-content p">
        <BackButton onClick={goBack} text={parent ? parentText : backText} />
      </div>
      <div className="main-content">
        {root && renderRoot(root)}
        {root && renderChain(root.id)}

        {brokenChains.length > 0 && <h3>Other replies</h3>}
        {brokenChains.map(a => {
          return (
            <div className="mb10">
              <NoteGhost className={`thread-note thread-root ghost-root`} key={a}>
                Missing event <Link to={eventLink(a)}>{a.substring(0, 8)}</Link>
              </NoteGhost>
              {renderChain(a)}
            </div>
          );
        })}
      </div>
    </>
  );
}

function getReplies(from: u256, chains?: Map<u256, Array<TaggedNostrEvent>>): Array<TaggedNostrEvent> {
  if (!from || !chains) {
    return [];
  }
  const replies = chains.get(from);
  return replies ? replies : [];
}
