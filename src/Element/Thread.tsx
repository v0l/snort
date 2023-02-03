import "./Thread.css";
import { useMemo, useState, useEffect, ReactNode } from "react";
import { useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";

import { TaggedRawEvent, u256, HexKey } from "Nostr";
import { default as NEvent } from "Nostr/Event";
import EventKind from "Nostr/EventKind";
import { eventLink } from "Util";
import BackButton from "Element/BackButton";
import Note from "Element/Note";
import NoteGhost from "Element/NoteGhost";
import Collapsed from "Element/Collapsed";
import type { RootState } from "State/Store";

interface DividerProps {
  variant?: "regular" | "small"
}

const Divider = ({ variant = "regular" }: DividerProps) => {
  const className = variant === "small" ? "divider divider-small" : "divider"
  return (
    <div className="divider-container">
      <div className={className}>
      </div>
    </div>
  )
}

interface SubthreadProps {
    isLastSubthread?: boolean
    from: u256
    path: u256[]
    notes: NEvent[]
    related: TaggedRawEvent[]
    chains: Map<u256, NEvent[]>
    onNavigate: (e: u256) => void
}

const Subthread = ({ path, from, notes, related, chains, onNavigate }: SubthreadProps) => {
  const renderSubthread = (a: NEvent, idx: number) => {
     const isLastSubthread = idx === notes.length - 1
     const replies = getReplies(a.Id, chains)
     return (
       <>
         <div className={`subthread-container ${replies.length > 0 ? 'subthread-multi' : ''}`}>
           <Divider />
           <Note
             className={`thread-note ${isLastSubthread && replies.length === 0 ? 'is-last-note' : ''}`}
             data-ev={a}
             key={a.Id}
             related={related}
           />
           <div className="line-container">
           </div>
         </div>
         {replies.length > 0 && (
           <TierTwo
            path={path}
            isLastSubthread={isLastSubthread}
            from={a.Id}
            notes={replies}
            related={related}
            chains={chains}
            onNavigate={onNavigate}
           />
         )}
       </>
     )
  }

  return (
    <div className="subthread">
      {notes.map(renderSubthread)}
    </div>
  )
}

const ThreadNote = ({ note, isLast, path, isLastSubthread, from, related, chains, onNavigate }: any) => {
  const [collapsed, setCollapsed] = useState(true)
  const replies = getReplies(note.Id, chains)
  const hasMultipleNotes = replies.length > 0
  const isLastVisibleNote = isLastSubthread && isLast && !hasMultipleNotes 
  const className = `subthread-container ${isLast && collapsed ? 'subthread-last' : 'subthread-multi subthread-mid'}`
  return (
    <>
      <div className={className}>
        <Divider variant="small" />
        <Note
          className={`thread-note ${isLastVisibleNote ? 'is-last-note' : ''}`}
          data-ev={note}
          key={note.Id}
          related={related}
        />
        <div className="line-container">
        </div>
      </div>
      {replies.length > 0 && (
        <Collapsed text="Show replies" collapsed={collapsed} setCollapsed={setCollapsed}>
          <TierThree
           path={path}
           isLastSubthread={isLastSubthread}
           from={from}
           notes={replies}
           related={related}
           chains={chains}
           onNavigate={onNavigate}
          />
        </Collapsed>
      )}
    </>
  )
}

const TierTwo = ({ path, isLastSubthread, from, notes, related, chains, onNavigate }: SubthreadProps) => {
  const [first, ...rest] = notes

  return (
    <>
      <ThreadNote
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
        const lastReply = idx === rest.length - 1
        return (
          <ThreadNote 
            path={path}
            from={from}
            onNavigate={onNavigate}
            note={r}
            chains={chains}
            related={related}
            isLastSubthread={isLastSubthread}
            isLast={lastReply}
          />
          )
        })
      }

    </>
  )
}

const TierThree = ({ path, isLastSubthread, from, notes, related, chains, onNavigate }: any) => {
  const [first, ...rest] = notes
  const replies = getReplies(first.Id, chains)
  const hasMultipleNotes = rest.length > 0 || replies.length > 0
  const isLast = replies.length === 0 && rest.length === 0
  return (
    <>
      <div className={`subthread-container ${hasMultipleNotes ? 'subthread-multi' : ''} ${isLast ? 'subthread-last' : 'subthread-mid'}`}>
        <Divider variant="small" />
        <Note
          className={`thread-note ${isLastSubthread && isLast ? 'is-last-note' : ''}`}
          data-ev={first}
          key={first.Id}
          related={related}
        />
        <div className="line-container">
        </div>
      </div>

      {path.length <= 1 ? (
        replies.length > 0 && (
          <div className="show-more-container">
            <button className="show-more" type="button" onClick={() => onNavigate(from)}>
              Show replies
            </button>
          </div>
        )
      ) : (
        replies.length > 0 && (
          <TierThree
           path={path.slice(1)}
           isLastSubthread={isLastSubthread}
           from={from}
           notes={replies}
           related={related}
           chains={chains}
           onNavigate={onNavigate}
        />
        )
      )}

      {rest.map((r: NEvent, idx: number) => {
        const lastReply = idx === rest.length - 1
        const lastNote = isLastSubthread && lastReply
        const noteReplies = getReplies(r.Id, chains)
        return (
          <div key={r.Id} className={`subthread-container ${lastReply ? '' : 'subthread-multi'} ${lastReply ? 'subthread-last' : 'subthread-mid'}`}>
            <Divider variant="small" />
            <Note
              className={`thread-note ${lastNote ? 'is-last-note' : ''}`}
              data-ev={r}
              key={r.Id}
              related={related}
            />
            <div className="line-container">
            </div>
          </div>
        )
        })
      }

    </>
  )
}


export interface ThreadProps {
    this?: u256,
    notes?: TaggedRawEvent[]
}

export default function Thread(props: ThreadProps) {
    const notes = props.notes ?? [];
    const parsedNotes = notes.map(a => new NEvent(a));
    // root note has no thread info
    const root = useMemo(() => parsedNotes.find(a => a.Thread === null), [notes]);
    const [path, setPath] = useState<HexKey[]>([])
    const currentId = path.length > 0 && path[path.length - 1]
    const currentRoot = useMemo(() => parsedNotes.find(a => a.Id === currentId), [notes, currentId]);
    const navigate = useNavigate()
    const isSingleNote = parsedNotes.filter(a => a.Kind === EventKind.TextNote).length === 1

    useEffect(() => {
      if (root) {
        setPath([root.Id])
      }
    }, [root])

    const chains = useMemo(() => {
        let chains = new Map<u256, NEvent[]>();
        parsedNotes?.filter(a => a.Kind === EventKind.TextNote).sort((a, b) => b.CreatedAt - a.CreatedAt).forEach((v) => {
            let replyTo = v.Thread?.ReplyTo?.Event ?? v.Thread?.Root?.Event;
            if (replyTo) {
                if (!chains.has(replyTo)) {
                    chains.set(replyTo, [v]);
                } else {
                    chains.get(replyTo)!.unshift(v);
                }
            } else if (v.Tags.length > 0) {
                console.log("Not replying to anything: ", v);
            }
        });

        return chains;
    }, [notes]);

    const brokenChains = useMemo(() => {
        return Array.from(chains?.keys()).filter(a => !parsedNotes?.some(b => b.Id === a));
    }, [chains]);

    function renderRoot(note: NEvent) {
        const className = `thread-root ${isSingleNote ? 'thread-root-single' : ''}`
        if (note) {
          return <Note className={className} key={note.Id} data-ev={note} related={notes} />
        } else {
            return (
              <NoteGhost className={className}>
                Loading thread root.. ({notes?.length} notes loaded)
              </NoteGhost>
           )
        }
    }

    function onNavigate(to: u256) {
      setPath([...path, to])
    }

    function renderChain(from: u256): ReactNode {
        if (!from || !chains) {
          return
        }
        let replies = chains.get(from);
        if (replies) {
          return <Subthread path={path} from={from} notes={replies} related={notes} chains={chains} onNavigate={onNavigate} />
        }
    }

    function goBack() {
      if (path.length > 1) {
        const newPath = path.slice(0, path.length - 1)
        setPath(newPath)
      } else {
        navigate("/")
      }
    }

    return (
      <div className="main-content mt10">
        <BackButton onClick={goBack} />
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
                  )
                })}
              </>
            )}
        </div>
      </div>
    );
}

function getReplies(from: u256, chains?: Map<u256, NEvent[]>): NEvent[] {
    if (!from || !chains) {
      return []
    }
    let replies = chains.get(from);
    return replies ? replies : []
}

