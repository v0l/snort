import { encodeTLVEntries, type ExternalStore, type TLVEntry, TLVEntryType, unixNow, unwrap } from "@snort/shared"
import {
  EventKind,
  type EventPublisher,
  type NostrEvent,
  type RequestBuilder,
  type SystemInterface,
  type TaggedNostrEvent,
  type UserMetadata,
} from "@snort/system"
import { useRequestBuilder } from "@snort/system-react"
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react"

import useEventPublisher from "@/Hooks/useEventPublisher"
import useLogin from "@/Hooks/useLogin"
import useModeration from "@/Hooks/useModeration"
import { GiftsCache } from "@/Cache"
import { findTag } from "@/Utils"
import type { LoginSession } from "@/Utils/Login"

import { Nip17Chats, Nip17ChatSystem } from "./nip17"

export enum ChatType {
  PublicGroupChat = 2,
  PrivateGroupChat = 3,
  PrivateDirectMessage = 4,
}

export interface ChatMessage {
  id: string
  from: string
  created_at: number
  tags: Array<Array<string>>
  needsDecryption: boolean
  content: string
  decrypt: (pub: EventPublisher) => Promise<string>
}

export interface ChatParticipant {
  type: "pubkey" | "generic"
  id: string
  profile?: UserMetadata
}

export interface Chat {
  type: ChatType
  id: string
  title?: string
  unread: number
  lastMessage: number
  participants: Array<ChatParticipant>
  messages: Array<ChatMessage>
  createMessage(msg: string, pub: EventPublisher): Promise<Array<NostrEvent>>
  sendMessage(ev: Array<NostrEvent>, system: SystemInterface): void | Promise<void>
  markRead(id?: string): void
}

export interface ChatSystem {
  subscription(session: LoginSession): RequestBuilder
  listChats(pk: string, evs: Array<TaggedNostrEvent>): Array<Chat>
  processEvents(pub: EventPublisher, evs: Array<TaggedNostrEvent>): Promise<void>
}

export function chatTo(e: NostrEvent) {
  if (e.kind === EventKind.DirectMessage) {
    return unwrap(findTag(e, "p"))
  } else if (e.kind === EventKind.SimpleChatMessage) {
    const gt = unwrap(e.tags.find(a => a[0] === "g"))
    return `${gt[2]}${gt[1]}`
  }
  throw new Error("Not a chat message")
}

export function inChatWith(e: NostrEvent, myPk: string) {
  if (e.pubkey === myPk) {
    return chatTo(e)
  } else {
    return e.pubkey
  }
}

export function selfChat(e: NostrEvent, myPk: string) {
  return chatTo(e) === myPk && e.pubkey === myPk
}

export function lastReadInChat(id: string) {
  const k = `dm:seen:${id}`
  return parseInt(window.localStorage.getItem(k) ?? "0", 10)
}

export function setLastReadIn(id: string, time?: number) {
  const now = time ?? unixNow()
  const k = `dm:seen:${id}`
  const current = lastReadInChat(id)
  if (current < now) {
    window.localStorage.setItem(k, now.toString())
  }
}

export function createChatLink(type: ChatType, ...params: Array<string>) {
  switch (type) {
    case ChatType.PrivateDirectMessage: {
      if (params.length > 1) throw new Error("Must only contain one pubkey")
      return `/messages/${encodeTLVEntries("nchat17", {
        type: TLVEntryType.Author,
        length: params[0].length,
        value: params[0],
      } as TLVEntry)}`
    }
    case ChatType.PrivateGroupChat: {
      return `/messages/${encodeTLVEntries(
        "nchat17",
        ...params.map(
          a =>
            ({
              type: TLVEntryType.Author,
              length: a.length,
              value: a,
            }) as TLVEntry,
        ),
      )}`
    }
  }
  throw new Error("Unknown chat type")
}

export function createEmptyChatObject(id: string) {
  if (id.startsWith("nchat17")) {
    return Nip17ChatSystem.createChatObj(id, [], GiftsCache)
  }
  throw new Error("Cant create new empty chat, unknown id")
}

export function useChatSystem<T extends ChatSystem & ExternalStore<Array<Chat>>>(sys: T) {
  const login = useLogin()
  const { publisher } = useEventPublisher()
  const chat = useSyncExternalStore(
    s => sys.hook(s),
    () => sys.snapshot(),
  )
  // biome-ignore lint/correctness/useExhaustiveDependencies: sys is a stable singleton
  const sub = useMemo(() => {
    return sys.subscription(login)
  }, [login])
  const data = useRequestBuilder(sub)
  const { isMuted } = useModeration()

  const processTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dataRef = useRef(data)
  dataRef.current = data
  const loadedPersisted = useRef(false)

  useEffect(() => {
    if (!publisher || loadedPersisted.current) return
    loadedPersisted.current = true
    GiftsCache.loadPersistedAndDecrypt(publisher)
  }, [publisher])

  // biome-ignore lint/correctness/useExhaustiveDependencies: data is used as trigger, dataRef for latest value
  useEffect(() => {
    if (!publisher) return
    if (processTimerRef.current) clearTimeout(processTimerRef.current)
    processTimerRef.current = setTimeout(() => {
      sys.processEvents(publisher, dataRef.current)
    }, 100)
    return () => {
      if (processTimerRef.current) clearTimeout(processTimerRef.current)
    }
  }, [data, publisher])

  // biome-ignore lint/correctness/useExhaustiveDependencies: sys is a stable singleton, chat intentionally triggers re-derive
  return useMemo(() => {
    if (login.publicKey) {
      return sys.listChats(
        login.publicKey,
        data.filter(a => !isMuted(a.pubkey)),
      )
    }
    return []
  }, [chat, login, data, isMuted])
}

export function useChatSystems() {
  const nip17 = useChatSystem(Nip17Chats)
  return nip17
}

export function useChat(id: string) {
  return useChatSystem(Nip17Chats).find(a => a.id === id) ?? createEmptyChatObject(id)
}
