/* eslint-disable no-debugger */
import { unwrap } from "@snort/shared";
import { EventExt, NostrLink, TaggedNostrEvent, u256 } from "@snort/system";
import useThreadFeed from "Feed/ThreadFeed";
import { ReactNode, createContext, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import useModeration from "./useModeration";

export interface ThreadContext {
  current: string;
  root?: TaggedNostrEvent;
  chains: Map<string, Array<TaggedNostrEvent>>;
  data: Array<TaggedNostrEvent>;
  reactions: Array<TaggedNostrEvent>;
  setCurrent: (i: string) => void;
}

export const ThreadContext = createContext({} as ThreadContext);

/**
 * Get the chain key as a reply event
 */
export function replyChainKey(ev: TaggedNostrEvent) {
  const t = EventExt.extractThread(ev);
  return t?.replyTo?.value ?? t?.root?.value;
}

/**
 * Get the chain key of this event
 */
export function chainKey(ev: TaggedNostrEvent) {
  const link = NostrLink.fromEvent(ev);
  return unwrap(link.toEventTag())[1];
}

export function ThreadContextWrapper({ link, children }: { link: NostrLink; children?: ReactNode }) {
  const location = useLocation();
  const [currentId, setCurrentId] = useState(unwrap(link.toEventTag())[1]);
  const feed = useThreadFeed(link);
  const { isBlocked } = useModeration();

  const chains = useMemo(() => {
    const chains = new Map<u256, Array<TaggedNostrEvent>>();
    if (feed.thread) {
      feed.thread
        ?.sort((a, b) => b.created_at - a.created_at)
        .filter(a => !isBlocked(a.pubkey))
        .forEach(v => {
          const replyTo = replyChainKey(v);
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
  }, [feed.thread]);

  // Root is the parent of the current note or the current note if its a root note or the root of the thread
  const root = useMemo(() => {
    const currentNote =
      feed.thread?.find(a => chainKey(a) === currentId) ??
      (location.state && "sig" in location.state ? (location.state as TaggedNostrEvent) : undefined);
    if (currentNote) {
      const key = replyChainKey(currentNote);
      if (key) {
        return feed.thread?.find(a => chainKey(a) === key);
      } else {
        return currentNote;
      }
    }
  }, [feed.thread.length, currentId, location]);

  const ctxValue = useMemo<ThreadContext>(() => {
    return {
      current: currentId,
      root,
      chains,
      reactions: feed.reactions,
      data: feed.thread,
      setCurrent: v => setCurrentId(v),
    };
  }, [root, chains]);

  return <ThreadContext.Provider value={ctxValue}>{children}</ThreadContext.Provider>;
}
