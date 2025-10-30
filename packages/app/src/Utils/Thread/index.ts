import { EventExt, EventKind, Nip10, TaggedNostrEvent, Thread } from "@snort/system";
import { createContext } from "react";
import { ThreadContextWrapper } from "./ThreadContextWrapper";

export { ThreadContextWrapper };

/**
 * Get the chain key as a reply event
 *
 * ie. Get the key for which this event is replying to
 */
export function replyChainKey(ev: TaggedNostrEvent) {
  if (ev.kind !== EventKind.Comment) {
    const t = EventExt.extractThread(ev);
    const tag = t?.replyTo ?? t?.root;
    return tag?.tagKey;
  } else {
    const k = ev.tags.find(t => ["e", "a", "i"].includes(t[0]));
    return k?.[1];
  }
}

export interface ThreadContextState {
  thread?: Thread;
  current: string;
  root?: TaggedNostrEvent;
  chains: Map<string, Array<string>>;
  data: Array<TaggedNostrEvent>;
  mutedData: Array<TaggedNostrEvent>;
  parent?: TaggedNostrEvent;
  setCurrent: (i: string) => void;
}

export const ThreadContext = createContext<ThreadContextState | undefined>(undefined);
