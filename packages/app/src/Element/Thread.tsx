import "./Thread.css";
import { useMemo, useState, ReactNode, useContext } from "react";
import { useIntl } from "react-intl";
import { useNavigate, Link, useParams } from "react-router-dom";
import { TaggedNostrEvent, u256, NostrPrefix, EventExt, parseNostrLink } from "@snort/system";

import { eventLink, getReactions, getAllReactions } from "SnortUtils";
import BackButton from "Element/BackButton";
import Note from "Element/Note";
import NoteGhost from "Element/NoteGhost";
import Collapsed from "Element/Collapsed";
import { ThreadContext, ThreadContextWrapper } from "Hooks/useThreadContext";

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

export function ThreadRoute() {
  const params = useParams();
  const link = parseNostrLink(params.id ?? "", NostrPrefix.Note);

  return (
    <ThreadContextWrapper link={link}>
      <Thread />
    </ThreadContextWrapper>
  );
}

export function Thread() {
  const thread = useContext(ThreadContext);

  const navigate = useNavigate();
  const isSingleNote = thread.chains?.size === 1 && [thread.chains.values].every(v => v.length === 0);
  const { formatMessage } = useIntl();

  function navigateThread(e: TaggedNostrEvent) {
    thread.setCurrent(e.id);
    //const link = encodeTLV(e.id, NostrPrefix.Event, e.relays);
  }

  const parent = useMemo(() => {
    if (thread.root) {
      const currentThread = EventExt.extractThread(thread.root);
      return (
        currentThread?.replyTo?.value ??
        currentThread?.root?.value ??
        (currentThread?.root?.key === "a" && currentThread.root?.value)
      );
    }
  }, [thread.root]);

  const brokenChains = Array.from(thread.chains?.keys()).filter(a => !thread.data?.some(b => b.id === a));

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
    if (!from || thread.chains.size === 0) {
      return;
    }
    const replies = thread.chains.get(from);
    if (replies && thread.current) {
      return (
        <Subthread
          active={thread.current}
          notes={replies}
          related={getAllReactions(
            thread.data,
            replies.map(a => a.id),
          )}
          chains={thread.chains}
          onNavigate={navigateThread}
        />
      );
    }
  }

  function goBack() {
    if (parent) {
      thread.setCurrent(parent);
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
        {thread.root && renderRoot(thread.root)}
        {thread.root && renderChain(thread.root.id)}

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
