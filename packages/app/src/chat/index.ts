import { useSyncExternalStore } from "react";
import { Nip4ChatSystem } from "./nip4";
import {
  EventKind,
  EventPublisher,
  NostrEvent,
  NostrPrefix,
  RequestBuilder,
  SystemInterface,
  TLVEntry,
  TLVEntryType,
  TaggedNostrEvent,
  UserMetadata,
  encodeTLVEntries,
} from "@snort/system";
import { unwrap, unixNow } from "@snort/shared";
import { Chats, GiftsCache } from "@/Cache";
import { findTag } from "@/SnortUtils";
import { Nip29ChatSystem } from "./nip29";
import useModeration from "@/Hooks/useModeration";
import useLogin from "@/Hooks/useLogin";
import { Nip24ChatSystem } from "./nip24";
import { LoginSession } from "@/Login";
import { Nip28ChatSystem } from "./nip28";

export enum ChatType {
  DirectMessage = 1,
  PublicGroupChat = 2,
  PrivateGroupChat = 3,
  PrivateDirectMessage = 4,
}

export interface ChatMessage {
  id: string;
  from: string;
  created_at: number;
  tags: Array<Array<string>>;
  needsDecryption: boolean;
  content: string;
  decrypt: (pub: EventPublisher) => Promise<string>;
}

export interface ChatParticipant {
  type: "pubkey" | "generic";
  id: string;
  profile?: UserMetadata;
}

export interface Chat {
  type: ChatType;
  id: string;
  title?: string;
  unread: number;
  lastMessage: number;
  participants: Array<ChatParticipant>;
  messages: Array<ChatMessage>;
  createMessage(msg: string, pub: EventPublisher): Promise<Array<NostrEvent>>;
  sendMessage(ev: Array<NostrEvent>, system: SystemInterface): void | Promise<void>;
}

export interface ChatSystem {
  /**
   * Create a request for this system to get updates
   */
  subscription(session: LoginSession): RequestBuilder | undefined;
  onEvent(evs: readonly TaggedNostrEvent[]): Promise<void> | void;

  listChats(pk: string): Array<Chat>;
}

export const Nip4Chats = new Nip4ChatSystem(Chats);
export const Nip29Chats = new Nip29ChatSystem(Chats);
export const Nip24Chats = new Nip24ChatSystem(GiftsCache);
export const Nip28Chats = new Nip28ChatSystem(Chats);

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

export function createChatLink(type: ChatType, ...params: Array<string>) {
  switch (type) {
    case ChatType.DirectMessage: {
      if (params.length > 1) throw new Error("Must only contain one pubkey");
      return `/messages/${encodeTLVEntries(
        "chat4" as NostrPrefix,
        {
          type: TLVEntryType.Author,
          length: params[0].length,
          value: params[0],
        } as TLVEntry,
      )}`;
    }
    case ChatType.PrivateDirectMessage: {
      if (params.length > 1) throw new Error("Must only contain one pubkey");
      return `/messages/${encodeTLVEntries(
        "chat24" as NostrPrefix,
        {
          type: TLVEntryType.Author,
          length: params[0].length,
          value: params[0],
        } as TLVEntry,
      )}`;
    }
    case ChatType.PrivateGroupChat: {
      return `/messages/${encodeTLVEntries(
        "chat24" as NostrPrefix,
        ...params.map(
          a =>
            ({
              type: TLVEntryType.Author,
              length: a.length,
              value: a,
            }) as TLVEntry,
        ),
      )}`;
    }
    case ChatType.PublicGroupChat: {
      return `/messages/${Nip28ChatSystem.chatId(params[0])}`;
    }
  }
  throw new Error("Unknown chat type");
}

export function createEmptyChatObject(id: string) {
  if (id.startsWith("chat41")) {
    return Nip4ChatSystem.createChatObj(id, []);
  }
  if (id.startsWith("chat241")) {
    return Nip24ChatSystem.createChatObj(id, []);
  }
  if (id.startsWith("chat281")) {
    return Nip28ChatSystem.createChatObj(id, []);
  }
  throw new Error("Cant create new empty chat, unknown id");
}

export function useNip4Chat() {
  const { publicKey } = useLogin(s => ({ publicKey: s.publicKey }));
  return useSyncExternalStore(
    c => Nip4Chats.hook(c),
    () => Nip4Chats.snapshot(publicKey),
  );
}

export function useNip29Chat() {
  return useSyncExternalStore(
    c => Nip29Chats.hook(c),
    () => Nip29Chats.snapshot(),
  );
}

export function useNip24Chat() {
  const { publicKey } = useLogin(s => ({ publicKey: s.publicKey }));
  return useSyncExternalStore(
    c => Nip24Chats.hook(c),
    () => Nip24Chats.snapshot(publicKey),
  );
}

export function useNip28Chat() {
  return useSyncExternalStore(
    c => Nip28Chats.hook(c),
    () => Nip28Chats.snapshot(),
  );
}

export function useChatSystem() {
  const nip4 = useNip4Chat();
  //const nip24 = useNip24Chat();
  const nip28 = useNip28Chat();
  const { isBlocked } = useModeration();

  return [...nip4, ...nip28].filter(a => {
    const authors = a.participants.filter(a => a.type === "pubkey").map(a => a.id);
    return !authors.every(a => isBlocked(a));
  });
}
