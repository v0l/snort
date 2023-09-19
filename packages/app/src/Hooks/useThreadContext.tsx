import { unwrap } from "@snort/shared";
import {
  EventExt,
  NostrLink,
  NostrPrefix,
  TaggedNostrEvent,
  u256,
  Thread as ThreadInfo,
} from "@snort/system";
import useThreadFeed from "Feed/ThreadFeed";
import { findTag } from "SnortUtils";
import { ReactNode, createContext, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

export interface ThreadContext {
  current: string;
  root?: TaggedNostrEvent;
  chains: Map<string, Array<TaggedNostrEvent>>;
  data: Array<TaggedNostrEvent>;
  setCurrent: (i: string) => void;
}

export const ThreadContext = createContext({} as ThreadContext);

export function ThreadContextWrapper({ link, children }: { link: NostrLink; children?: ReactNode }) {
  const location = useLocation();
  const [currentId, setCurrentId] = useState(link.id);
  const feed = useThreadFeed(link);

  const chains = useMemo(() => {
    const chains = new Map<u256, Array<TaggedNostrEvent>>();
    if (feed.thread) {
      feed.thread
        ?.sort((a, b) => b.created_at - a.created_at)
        .forEach(v => {
          const t = EventExt.extractThread(v);
          let replyTo = t?.replyTo?.value ?? t?.root?.value;
          if (t?.root?.key === "a" && t?.root?.value) {
            const parsed = t.root.value.split(":");
            replyTo = feed.thread?.find(
              a => a.kind === Number(parsed[0]) && a.pubkey === parsed[1] && findTag(a, "d") === parsed[2],
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
  }, [feed.thread]);

  // Root is the parent of the current note or the current note if its a root note or the root of the thread
  const root = useMemo(() => {
    const currentNote =
    feed.thread?.find(
        ne =>
          ne.id === currentId ||
          (link.type === NostrPrefix.Address && findTag(ne, "d") === currentId && ne.pubkey === link.author),
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
          return feed.thread?.find(
            a => a.kind === Number(parsed[0]) && a.pubkey === parsed[1] && findTag(a, "d") === parsed[2],
          );
        }
        if (replyTo.value) {
          return feed.thread?.find(a => a.id === replyTo.value);
        }
      }

      const possibleRoots = feed.thread?.filter(a => {
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
  }, [feed.thread, currentId, location]);

  const ctxValue = useMemo(() => {
    return {
      current: currentId,
      root,
      chains,
      data: feed.reactions,
      setCurrent: v => setCurrentId(v),
    } as ThreadContext;
  }, [root, chains]);

  return <ThreadContext.Provider value={ctxValue}>{children}</ThreadContext.Provider>;
}
