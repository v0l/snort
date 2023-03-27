import "./Thread.css";
import { useMemo, useState, useEffect, ReactNode } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import { useNavigate, useLocation, Link } from "react-router-dom";

import { TaggedRawEvent, u256, HexKey } from "@snort/nostr";
import { Event as NEvent, EventKind } from "@snort/nostr";
import { eventLink, bech32ToHex, unwrap } from "Util";
import BackButton from "Element/BackButton";
import Note from "Element/Note";
import NoteGhost from "Element/NoteGhost";
import Collapsed from "Element/Collapsed";
import messages from "./messages";

function getParent(ev: HexKey, chains: Map<HexKey, NEvent[]>): HexKey | undefined {
  for (const [k, vs] of chains.entries()) {
    const fs = vs.map(a => a.Id);
    if (fs.includes(ev)) {
      return k;
    }
  }
}

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
  from: u256;
  active: u256;
  path: u256[];
  notes: NEvent[];
  related: TaggedRawEvent[];
  chains: Map<u256, NEvent[]>;
  onNavigate: (e: u256) => void;
}

const Subthread = ({ active, path, notes, related, chains, onNavigate }: SubthreadProps) => {
  const renderSubthread = (a: NEvent, idx: number) => {
    const isLastSubthread = idx === notes.length - 1;
    const replies = getReplies(a.Id, chains);
    return (
      <>
        <div className={`subthread-container ${replies.length > 0 ? "subthread-multi" : ""}`}>
          <Divider />
          <Note
            highlight={active === a.Id}
            className={`thread-note ${isLastSubthread && replies.length === 0 ? "is-last-note" : ""}`}
            data-ev={a}
            key={a.Id}
            related={related}
          />
          <div className="line-container"></div>
        </div>
        {replies.length > 0 && (
          <TierTwo
            active={active}
            isLastSubthread={isLastSubthread}
            path={path}
            from={a.Id}
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
  note: NEvent;
  isLast: boolean;
}

const ThreadNote = ({
  active,
  note,
  isLast,
  path,
  isLastSubthread,
  from,
  related,
  chains,
  onNavigate,
}: ThreadNoteProps) => {
  const { formatMessage } = useIntl();
  const replies = getReplies(note.Id, chains);
  const activeInReplies = replies.map(r => r.Id).includes(active);
  const [collapsed, setCollapsed] = useState(!activeInReplies);
  const hasMultipleNotes = replies.length > 0;
  const isLastVisibleNote = isLastSubthread && isLast && !hasMultipleNotes;
  const className = `subthread-container ${isLast && collapsed ? "subthread-last" : "subthread-multi subthread-mid"}`;
  return (
    <>
      <div className={className}>
        <Divider variant="small" />
        <Note
          highlight={active === note.Id}
          className={`thread-note ${isLastVisibleNote ? "is-last-note" : ""}`}
          data-ev={note}
          key={note.Id}
          related={related}
        />
        <div className="line-container"></div>
      </div>
      {replies.length > 0 &&
        (activeInReplies ? (
          <TierThree
            active={active}
            path={path}
            isLastSubthread={isLastSubthread}
            from={from}
            notes={replies}
            related={related}
            chains={chains}
            onNavigate={onNavigate}
          />
        ) : (
          <Collapsed text={formatMessage(messages.ShowReplies)} collapsed={collapsed} setCollapsed={setCollapsed}>
            <TierThree
              active={active}
              path={path}
              isLastSubthread={isLastSubthread}
              from={from}
              notes={replies}
              related={related}
              chains={chains}
              onNavigate={onNavigate}
            />
          </Collapsed>
        ))}
    </>
  );
};

const TierTwo = ({ active, isLastSubthread, path, from, notes, related, chains, onNavigate }: SubthreadProps) => {
  const [first, ...rest] = notes;

  return (
    <>
      <ThreadNote
        active={active}
        path={path}
        from={from}
        onNavigate={onNavigate}
        note={first}
        chains={chains}
        related={related}
        isLastSubthread={isLastSubthread}
        isLast={rest.length === 0}
      />

      {rest.map((r: NEvent, idx: number) => {
        const lastReply = idx === rest.length - 1;
        return (
          <ThreadNote
            active={active}
            path={path}
            from={from}
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

const TierThree = ({ active, path, isLastSubthread, from, notes, related, chains, onNavigate }: SubthreadProps) => {
  const [first, ...rest] = notes;
  const replies = getReplies(first.Id, chains);
  const activeInReplies = notes.map(r => r.Id).includes(active) || replies.map(r => r.Id).includes(active);
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
          highlight={active === first.Id}
          className={`thread-note ${isLastSubthread && isLast ? "is-last-note" : ""}`}
          data-ev={first}
          key={first.Id}
          related={related}
        />
        <div className="line-container"></div>
      </div>

      {path.length <= 1 || !activeInReplies
        ? replies.length > 0 && (
            <div className="show-more-container">
              <button className="show-more" type="button" onClick={() => onNavigate(from)}>
                <FormattedMessage {...messages.ShowReplies} />
              </button>
            </div>
          )
        : replies.length > 0 && (
            <TierThree
              active={active}
              path={path.slice(1)}
              isLastSubthread={isLastSubthread}
              from={from}
              notes={replies}
              related={related}
              chains={chains}
              onNavigate={onNavigate}
            />
          )}

      {rest.map((r: NEvent, idx: number) => {
        const lastReply = idx === rest.length - 1;
        const lastNote = isLastSubthread && lastReply;
        return (
          <div
            key={r.Id}
            className={`subthread-container ${lastReply ? "" : "subthread-multi"} ${
              lastReply ? "subthread-last" : "subthread-mid"
            }`}>
            <Divider variant="small" />
            <Note
              className={`thread-note ${lastNote ? "is-last-note" : ""}`}
              highlight={active === r.Id}
              data-ev={r}
              key={r.Id}
              related={related}
            />
            <div className="line-container"></div>
          </div>
        );
      })}
    </>
  );
};

export interface ThreadProps {
  notes?: TaggedRawEvent[];
  selected?: u256;
}

export default function Thread(props: ThreadProps) {
  const notes = props.notes ?? [];
  const parsedNotes = notes.map(a => new NEvent(a));
  const [path, setPath] = useState<HexKey[]>([]);
  const currentRoot = useMemo(() => parsedNotes.find(a => a.Id === props.selected), [notes, props.selected]);
  const [navigated, setNavigated] = useState(false);
  const navigate = useNavigate();
  const isSingleNote = parsedNotes.filter(a => a.Kind === EventKind.TextNote).length === 1;
  const location = useLocation();
  const { formatMessage } = useIntl();
  const urlNoteId = location?.pathname.slice(3);
  const urlNoteHex = urlNoteId && bech32ToHex(urlNoteId);

  const chains = useMemo(() => {
    const chains = new Map<u256, NEvent[]>();
    parsedNotes
      ?.filter(a => a.Kind === EventKind.TextNote)
      .sort((a, b) => b.CreatedAt - a.CreatedAt)
      .forEach(v => {
        const replyTo = v.Thread?.ReplyTo?.Event ?? v.Thread?.Root?.Event;
        if (replyTo) {
          if (!chains.has(replyTo)) {
            chains.set(replyTo, [v]);
          } else {
            unwrap(chains.get(replyTo)).push(v);
          }
        } else if (v.Tags.length > 0) {
          console.log("Not replying to anything: ", v);
        }
      });

    return chains;
  }, [notes]);

  const root = useMemo(() => {
    const isRoot = (ne?: NEvent) => ne?.Thread === null;
    const currentNote = parsedNotes.find(ne => ne.Id === urlNoteHex);

    if (isRoot(currentNote)) {
      return currentNote;
    }

    const rootEventId = currentNote?.Thread?.Root?.Event;

    // sometimes the root event ID is missing, and we can only take the happy path if the root event ID exists
    if (rootEventId) {
      return parsedNotes.find(ne => ne.Id === rootEventId);
    }

    const possibleRoots = parsedNotes.filter(isRoot);

    // worst case we need to check every possible root to see which one contains the current note as a child
    for (const ne of possibleRoots) {
      const children = chains.get(ne.Id) ?? [];

      if (children.find(ne => ne.Id === urlNoteHex)) {
        return ne;
      }
    }
  }, [notes, chains, urlNoteHex]);

  useEffect(() => {
    if (!root) {
      return;
    }

    if (navigated) {
      return;
    }

    if (root.Id === urlNoteHex) {
      setPath([root.Id]);
      setNavigated(true);
      return;
    }

    const subthreadPath = [];
    let parent = getParent(urlNoteHex, chains);
    while (parent) {
      subthreadPath.unshift(parent);
      parent = getParent(parent, chains);
    }
    setPath(subthreadPath);
    setNavigated(true);
  }, [root, navigated, urlNoteHex, chains]);

  const brokenChains = useMemo(() => {
    return Array.from(chains?.keys()).filter(a => !parsedNotes?.some(b => b.Id === a));
  }, [chains]);

  function renderRoot(note: NEvent) {
    const className = `thread-root ${isSingleNote ? "thread-root-single" : ""}`;
    if (note) {
      return (
        <Note
          className={className}
          key={note.Id}
          data-ev={note}
          related={notes}
          options={{ showReactionsLink: true }}
        />
      );
    } else {
      return <NoteGhost className={className}>Loading thread root.. ({notes?.length} notes loaded)</NoteGhost>;
    }
  }

  function onNavigate(to: u256) {
    setPath([...path, to]);
  }

  function renderChain(from: u256): ReactNode {
    if (!from || !chains) {
      return;
    }
    const replies = chains.get(from);
    if (replies) {
      return (
        <Subthread
          active={urlNoteHex}
          path={path}
          from={from}
          notes={replies}
          related={notes}
          chains={chains}
          onNavigate={onNavigate}
        />
      );
    }
  }

  function goBack() {
    if (path.length > 1) {
      const newPath = path.slice(0, path.length - 1);
      setPath(newPath);
    } else {
      navigate(location.state?.from ?? "/");
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
    <div className="main-content mt10">
      <BackButton onClick={goBack} text={path?.length > 1 ? parentText : backText} />
      <div className="thread-container">
        {currentRoot && renderRoot(currentRoot)}
        {currentRoot && renderChain(currentRoot.Id)}
        {currentRoot === root && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

function getReplies(from: u256, chains?: Map<u256, NEvent[]>): NEvent[] {
  if (!from || !chains) {
    return [];
  }
  const replies = chains.get(from);
  return replies ? replies : [];
}
