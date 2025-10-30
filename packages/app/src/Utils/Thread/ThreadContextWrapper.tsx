import { dedupeBy, unwrap } from "@snort/shared";
import {
  EventExt,
  EventKind,
  NostrLink,
  NoteCollection,
  NoteStore,
  RequestBuilder,
  TaggedNostrEvent,
} from "@snort/system";
import { useEventFeed, useRequestBuilder } from "@snort/system-react";
import { ReactNode, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import useModeration from "@/Hooks/useModeration";
import { replyChainKey, ThreadContext } from ".";

/**
 * Thread context wrapper, which loads threads for a given link
 */
export function ThreadContextWrapper({ link, children }: { link: NostrLink; children?: ReactNode }) {
  const location = useLocation();
  const [currentId, setCurrentId] = useState(link.tagKey);
  const primary = useEventFeed(link);
  const parsedThread = primary ? EventExt.extractThread(primary) : undefined;

  const subReplies = useMemo(() => {
    // top level note of this thread
    // if primary is loaded and its a root note, use its link as the rootLink
    const rootLink = parsedThread?.root ?? parsedThread?.replyTo ?? (primary && !parsedThread ? link : undefined);
    const k = rootLink ? rootLink.tagKey : undefined;
    const sub = new RequestBuilder(`thread-replies:${k}`);
    if (rootLink) {
      sub.withFilter().link(rootLink);
      const f = sub.withFilter().kinds([EventKind.TextNote]).replyToLink([rootLink]);
      if (rootLink.kind && rootLink.kind !== EventKind.TextNote) {
        f.kinds([EventKind.Comment]);
      }
    }
    return sub;
  }, [primary, link]);

  const rootReplies = useRequestBuilder(subReplies);

  const ns = new NoteCollection();
  ns.add(rootReplies);
  if (primary) {
    ns.add(primary);
  }

  const { muted, unmuted, chains } = useFilteredThread(ns.snapshot);

  // Root is the parent of the current note or
  // the current note if its a root note or
  // the root of the thread
  const rootNote = useMemo(() => {
    const currentNoteRouter =
      location.state && "sig" in location.state ? (location.state as TaggedNostrEvent) : undefined;
    const currentNote = currentNoteRouter ?? unmuted.find(a => EventExt.keyOf(a) === currentId);
    if (currentNote) {
      const key = replyChainKey(currentNote);
      if (key) {
        return unmuted.find(a => EventExt.keyOf(a) === key);
      } else {
        return currentNote;
      }
    }
  }, [unmuted, location.state, currentId]);

  /// Parent is the replied to note of the root note
  const parent = useMemo(() => {
    if (rootNote) {
      const parentId = replyChainKey(rootNote);
      return unmuted.find(a => EventExt.keyOf(a) === parentId);
    }
  }, [rootNote, unmuted]);

  const ctxValue = {
    thread: parsedThread,
    current: currentId,
    root: rootNote,
    chains,
    data: unmuted,
    mutedData: muted,
    parent,
    setCurrent: (v: string) => setCurrentId(v),
  };

  return <ThreadContext.Provider value={ctxValue}>{children}</ThreadContext.Provider>;
}

function useFilteredThread(notes: Array<TaggedNostrEvent>) {
  const { isMuted } = useModeration();

  const unmuted: TaggedNostrEvent[] = [];
  const muted: TaggedNostrEvent[] = [];

  notes.forEach(n => {
    if (isMuted(n.pubkey)) {
      muted.push(n);
    } else {
      unmuted.push(n);
    }
  });

  const chains = new Map<string, Array<string>>();
  unmuted.forEach(v => {
    const replyTo = replyChainKey(v);
    if (replyTo) {
      const vk = EventExt.keyOf(v);
      if (!chains.has(replyTo)) {
        chains.set(replyTo, [vk]);
      } else {
        chains.get(replyTo)!.push(vk);
      }
    }
  });

  return { unmuted, muted, chains };
}
