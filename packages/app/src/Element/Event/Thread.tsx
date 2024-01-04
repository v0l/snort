import "./Thread.css";
import { useMemo, useState, ReactNode, useContext, Fragment } from "react";
import { useIntl } from "react-intl";
import { useNavigate, useParams } from "react-router-dom";
import { TaggedNostrEvent, u256, NostrPrefix, EventExt, parseNostrLink, NostrLink } from "@snort/system";
import classNames from "classnames";

import { getAllLinkReactions, getLinkReactions } from "@/SnortUtils";
import BackButton from "@/Element/Button/BackButton";
import Note from "@/Element/Event/Note";
import NoteGhost from "@/Element/Event/NoteGhost";
import Collapsed from "@/Element/Collapsed";
import { ThreadContext, ThreadContextWrapper, chainKey } from "@/Hooks/useThreadContext";

import messages from "../messages";

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
      <Fragment key={a.id}>
        <div className={`subthread-container ${replies.length > 0 ? "subthread-multi" : ""}`}>
          <Divider />
          <Note
            highlight={active === a.id}
            className={`thread-note ${isLastSubthread && replies.length === 0 ? "is-last-note" : ""}`}
            data={a}
            key={a.id}
            related={related}
            onClick={onNavigate}
            threadChains={chains}
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
      </Fragment>
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
          related={related}
          onClick={onNavigate}
          threadChains={chains}
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
            key={r.id}
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
          related={related}
          threadChains={chains}
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
              related={related}
              onClick={onNavigate}
              threadChains={chains}
            />
            <div className="line-container"></div>
          </div>
        );
      })}
    </>
  );
};

export function ThreadRoute({ id }: { id?: string }) {
  const params = useParams();
  const resolvedId = id ?? params.id;
  const link = parseNostrLink(resolvedId ?? "", NostrPrefix.Note);

  return (
    <ThreadContextWrapper link={link}>
      <Thread />
    </ThreadContextWrapper>
  );
}

export function Thread(props: { onBack?: () => void; disableSpotlight?: boolean }) {
  const thread = useContext(ThreadContext);

  const navigate = useNavigate();
  const isSingleNote = thread.chains?.size === 1 && [thread.chains.values].every(v => v.length === 0);
  const { formatMessage } = useIntl();

  function navigateThread(e: TaggedNostrEvent) {
    thread.setCurrent(e.id);
    //router.navigate(`/${NostrLink.fromEvent(e).encode()}`, { replace: true })
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

  function renderRoot(note: TaggedNostrEvent) {
    const className = `thread-root${isSingleNote ? " thread-root-single" : ""}`;
    if (note) {
      return (
        <Note
          className={className}
          key={note.id}
          data={note}
          related={getLinkReactions(thread.reactions, NostrLink.fromEvent(note))}
          options={{ showReactionsLink: true, showMediaSpotlight: !props.disableSpotlight, isRoot: true }}
          onClick={navigateThread}
          threadChains={thread.chains}
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
          related={getAllLinkReactions(
            thread.reactions,
            replies.map(a => NostrLink.fromEvent(a)),
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
    } else if (props.onBack) {
      props.onBack();
    } else {
      navigate(-1);
    }
  }

  const parentText = formatMessage({
    defaultMessage: "Parent",
    id: "ADmfQT",
    description: "Link to parent note in thread",
  });

  const debug = window.location.search.includes("debug=true");
  return (
    <>
      {debug && (
        <div className="main-content p xs">
          <h1>Chains</h1>
          <pre>
            {JSON.stringify(
              Object.fromEntries([...thread.chains.entries()].map(([k, v]) => [k, v.map(c => c.id)])),
              undefined,
              "  ",
            )}
          </pre>
          <h1>Current</h1>
          <pre>{JSON.stringify(thread.current)}</pre>
          <h1>Root</h1>
          <pre>{JSON.stringify(thread.root, undefined, "  ")}</pre>
          <h1>Data</h1>
          <pre>{JSON.stringify(thread.data, undefined, "  ")}</pre>
          <h1>Reactions</h1>
          <pre>{JSON.stringify(thread.reactions, undefined, "  ")}</pre>
        </div>
      )}
      {parent && (
        <div className="main-content p">
          <BackButton onClick={goBack} text={parentText} />
        </div>
      )}
      <div className="main-content">
        {thread.root && renderRoot(thread.root)}
        {thread.root && renderChain(chainKey(thread.root))}
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
