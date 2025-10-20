import { encodeTLVEntries, ExternalStore, NostrPrefix, TLVEntry, TLVEntryType, unixNow, unwrap } from "@snort/shared";
import {
  EventKind,
  EventPublisher,
  NostrEvent,
  RequestBuilder,
  SystemInterface,
  TaggedNostrEvent,
  UserMetadata,
} from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useEffect, useMemo, useSyncExternalStore } from "react";

import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import useModeration from "@/Hooks/useModeration";
import { findTag } from "@/Utils";
import { LoginSession } from "@/Utils/Login";

import { Nip17Chats, Nip17ChatSystem } from "./nip17";

export enum ChatType {
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
  markRead(id?: string): void;
}

export interface ChatSystem {
  /**
   * Create a request for this system to get updates
   */
  subscription(session: LoginSession): RequestBuilder;

  /**
   * Create a list of chats for a given pubkey and set of events
   */
  listChats(pk: string, evs: Array<TaggedNostrEvent>): Array<Chat>;

  /**
   * Process events received from the subscription
   */
  processEvents(pub: EventPublisher, evs: Array<TaggedNostrEvent>): Promise<void>;
}

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

export function setLastReadIn(id: string, time?: number) {
  const now = time ?? unixNow();
  const k = `dm:seen:${id}`;
  const current = lastReadInChat(id);
  if (current < now) {
    window.localStorage.setItem(k, now.toString());
  }
}

export function createChatLink(type: ChatType, ...params: Array<string>) {
  switch (type) {
    case ChatType.PrivateDirectMessage: {
      if (params.length > 1) throw new Error("Must only contain one pubkey");
      return `/messages/${encodeTLVEntries(NostrPrefix.Chat17, {
        type: TLVEntryType.Author,
        length: params[0].length,
        value: params[0],
      } as TLVEntry)}`;
    }
    case ChatType.PrivateGroupChat: {
      return `/messages/${encodeTLVEntries(
        NostrPrefix.Chat17,
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
  }
  throw new Error("Unknown chat type");
}

export function createEmptyChatObject(id: string) {
  if (id.startsWith(NostrPrefix.Chat17)) {
    return Nip17ChatSystem.createChatObj(id, []);
  }
  throw new Error("Cant create new empty chat, unknown id");
}

export function useChatSystem<T extends ChatSystem & ExternalStore<Array<Chat>>>(sys: T) {
  const login = useLogin();
  const { publisher } = useEventPublisher();
  const chat = useSyncExternalStore(
    s => sys.hook(s),
    () => sys.snapshot(),
  );
  const sub = useMemo(() => {
    return sys.subscription(login);
  }, [login]);
  const data = useRequestBuilder(sub);
  const { isMuted } = useModeration();

  useEffect(() => {
    if (publisher) {
      sys.processEvents(publisher, data);
    }
  }, [data, publisher]);

  return useMemo(() => {
    if (login.publicKey) {
      return sys.listChats(
        login.publicKey,
        data.filter(a => !isMuted(a.pubkey)),
      );
    }
    return [];
  }, [chat, login, data, isMuted]);
}

export function useChatSystems() {
  const nip17 = useChatSystem(Nip17Chats);

  return nip17;
}

export function useChat(id: string) {
  const ret = useChatSystem(Nip17Chats).find(a => a.id === id);
  return ret;
}
