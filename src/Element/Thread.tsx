import "./Thread.css";
import { useMemo, useCallback, useState, useEffect, ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";

import { TaggedRawEvent, u256, HexKey } from "Nostr";
import { default as NEvent } from "Nostr/Event";
import EventKind from "Nostr/EventKind";
import { eventLink } from "Util";
import BackButton from "Element/BackButton";
import Note from "Element/Note";
import NoteGhost from "Element/NoteGhost";
import Collapsed from "Element/Collapsed";
import ShowMore from "Element/ShowMore";

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
    tier: number
    from: u256
    notes: NEvent[]
    related: TaggedRawEvent[]
    chains: Map<u256, NEvent[]>
    onNavigate: (e: u256) => void
}

const Subthread = ({ tier, from, notes, related, chains, onNavigate }: SubthreadProps) => {
  const renderSubthread = (a: NEvent) => {
     const replies = getReplies(a.Id, chains)
     return (
       <>
         <div className={`subthread-container ${replies.length > 0 ? 'subthread-multi' : ''}`}>
           <Divider />
           <Note
             className={`thread-note tier-one`}
             data-ev={a}
             key={a.Id}
             related={related}
           />
           <div className="line-container">
           </div>
         </div>
         {replies.length > 0 && (
           <TierTwo tier={2} from={a.Id} notes={replies} related={related} chains={chains} onNavigate={onNavigate} />
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

const TierTwo = ({ tier, from, notes, related, chains, onNavigate }: SubthreadProps) => {
  const [first, ...rest] = notes
  const replies = getReplies(first.Id, chains) 
  const isLast = replies.length === 0
  const className = `subthread-container ${isLast ? 'subthread-last' : 'subthread-multi'} subthread-mid`
  return (
    <>
      <div className={className}>
        <Divider variant="small" />
        <Note
          className={`thread-note tier-two`}
          data-ev={first}
          key={first.Id}
          related={related}
        />
        <div className="line-container">
        </div>
      </div>

      {replies.length > 0 && (
        <Collapsed text="Show replies">
          <TierThree tier={3} from={from} notes={replies} related={related} chains={chains} onNavigate={onNavigate} />
        </Collapsed>
      )}
    </>
  )
}

const TierThree = ({ tier, from, notes, related, chains, onNavigate }: any) => {
  const [first, ...rest] = notes
  const replies = getReplies(first.Id, chains)
  const isLast = replies.length === 0
  return (
    <div className={`subthread-container subthread-multi ${isLast ? 'subthread-last' : 'subthread-mid'}`}> 
      <Divider variant="small" />
      <Note
        className={`thread-note tier-three`}
        data-ev={first}
        key={first.Id}
        related={related}
      />
      <div className="line-container">
      </div>
      <div className="show-more-container">
        <button className="show-more" type="button" onClick={() => onNavigate(from)}>
          Show replies
        </button>
      </div>
    </div>
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
        if (note) {
          return <Note key={note.Id} data-ev={note} related={notes} isThread />
        } else {
            return (
              <NoteGhost className="thread-root">
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
          return <Subthread tier={1} from={from} notes={replies} related={notes} chains={chains} onNavigate={onNavigate} />
        }
    }

    function goBack() {
      if (path.length > 1) {
        setPath(path.slice(0, path.length - 1))
      } else {
        navigate(-1)
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
                {brokenChains.map(a => {
                  return (
                    <>
                      <NoteGhost className="thread-note" key={a}>
                          Missing event <Link to={eventLink(a)}>{a.substring(0, 8)}</Link>
                      </NoteGhost>
                      {renderChain(a)}
                    </>
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

