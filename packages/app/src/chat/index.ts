import { useSyncExternalStore } from "react";
import { Nip4ChatSystem } from "./nip4";
import { EventKind, EventPublisher, NostrEvent, RequestBuilder, SystemInterface, UserMetadata } from "@snort/system";
import { unwrap } from "@snort/shared";
import { Chats } from "Cache";
import { findTag, unixNow } from "SnortUtils";
import { Nip29ChatSystem } from "./nip29";
import useModeration from "Hooks/useModeration";
import useLogin from "Hooks/useLogin";

export enum ChatType {
  DirectMessage = 1,
  PublicGroupChat = 2,
  PrivateGroupChat = 3,
}

export interface Chat {
  type: ChatType;
  id: string;
  unread: number;
  lastMessage: number;
  messages: Array<NostrEvent>;
  profile?: UserMetadata;
  createMessage(msg: string, pub: EventPublisher): Promise<NostrEvent>;
  sendMessage(ev: NostrEvent, system: SystemInterface): void | Promise<void>;
}

export interface ChatSystem {
  /**
   * Create a request for this system to get updates
   */
  subscription(id: string): RequestBuilder | undefined;
  onEvent(evs: Array<NostrEvent>): Promise<void> | void;

  listChats(pk: string): Array<Chat>;
}

export const Nip4Chats = new Nip4ChatSystem(Chats);
export const Nip29Chats = new Nip29ChatSystem(Chats);

/**
 * Extract the P tag of the event
 */
export function chatTo(e: NostrEvent) {
  if (e.kind === EventKind.DirectMessage) {
    return unwrap(findTag(e, "p"));
  } else if (e.kind === EventKind.SimpleChatMessage) {
    const gt = unwrap(e.tags.find(a => a[0] === "g"));
    return `${gt[2]}${gt[1]}`;
  }
  throw new Error("Not a chat message");
}

export function inChatWith(e: NostrEvent, myPk: string) {
  if (e.pubkey === myPk) {
    return chatTo(e);
  } else {
    return e.pubkey;
  }
}

export function selfChat(e: NostrEvent, myPk: string) {
  return chatTo(e) === myPk && e.pubkey === myPk;
}

export function lastReadInChat(id: string) {
  const k = `dm:seen:${id}`;
  return parseInt(window.localStorage.getItem(k) ?? "0");
}

export function setLastReadIn(id: string) {
  const now = unixNow();
  const k = `dm:seen:${id}`;
  window.localStorage.setItem(k, now.toString());
}

export function useNip4Chat() {
  const { publicKey } = useLogin();
  return useSyncExternalStore(
    c => Nip4Chats.hook(c),
    () => Nip4Chats.snapshot(publicKey)
  );
}

export function useNip29Chat() {
  return useSyncExternalStore(
    c => Nip29Chats.hook(c),
    () => Nip29Chats.snapshot()
  );
}

export function useChatSystem() {
  const nip4 = useNip4Chat();
  const nip29 = useNip29Chat();
  const { muted, blocked } = useModeration();

  return [...nip4, ...nip29].filter(a => !(muted.includes(a.id) || blocked.includes(a.id)));
}
