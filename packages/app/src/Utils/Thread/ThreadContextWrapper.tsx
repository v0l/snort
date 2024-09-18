import { unwrap } from "@snort/shared";
import { NostrLink, TaggedNostrEvent } from "@snort/system";
import { ReactNode, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import useThreadFeed from "@/Feed/ThreadFeed";
import useModeration from "@/Hooks/useModeration";
import { chainKey, replyChainKey } from "@/Utils/Thread/ChainKey";
import { ThreadContext, ThreadContextState } from "@/Utils/Thread/ThreadContext";

export function ThreadContextWrapper({ link, children }: { link: NostrLink; children?: ReactNode }) {
  const location = useLocation();
  const [currentId, setCurrentId] = useState(unwrap(link.toEventTag())[1]);
  const feedData = useThreadFeed(link);
  const { isMuted } = useModeration();

  function threadChains(notes: Array<TaggedNostrEvent>) {
    const chains = new Map<string, Array<TaggedNostrEvent>>();
    notes
      .filter(a => !isMuted(a.pubkey))
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
    return chains;
  }

  // Root is the parent of the current note or
  // the current note if its a root note or
  // the root of the thread
  const root = useMemo(() => {
    const currentNote =
      feedData.find(a => chainKey(a) === currentId) ??
      (location.state && "sig" in location.state ? (location.state as TaggedNostrEvent) : undefined);
    if (currentNote) {
      const key = replyChainKey(currentNote);
      if (key) {
        return feedData.find(a => chainKey(a) === key);
      } else {
        return currentNote;
      }
    }
  }, [feedData, location.state, currentId]);

  const ctxValue = useMemo<ThreadContextState>(() => {
    return {
      current: currentId,
      root,
      chains: threadChains(feedData.filter(a => !isMuted(a.pubkey))),
      data: feedData,
      mutedData: feedData.filter(a => isMuted(a.pubkey)),
      setCurrent: v => setCurrentId(v),
    };
  }, [currentId, root, feedData]);

  return <ThreadContext.Provider value={ctxValue}>{children}</ThreadContext.Provider>;
}
