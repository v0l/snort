import { decodeTLV, encodeTLVEntries, ExternalStore, type TLVEntry, TLVEntryType } from "@snort/shared"
import { EventKind, type EventPublisher, type NostrEvent, RequestBuilder, type TaggedNostrEvent } from "@snort/system"

import { GiftsCache } from "@/Cache"
import type { GiftWrapCache, UnwrappedGift } from "@/Cache/GiftWrapCache"
import { getCachedDecryptedContent } from "@/Cache/GiftWrapCache"
import { type Chat, type ChatSystem, ChatType, lastReadInChat, setLastReadIn } from "@/chat"
import type { LoginSession } from "@/Utils/Login"
import { GetPowWorker } from "@/Utils/wasm"

function computeChatId(u: UnwrappedGift, pk: string): string | undefined {
  const pTags = [...(u.tags ?? []).filter(a => a[0] === "p").map(a => a[1]), u.inner.pubkey]
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort()
    .filter(a => a !== pk)

  if (pTags.length === 0) return
  return encodeTLVEntries(
    "nchat17",
    ...pTags.map(
      v =>
        ({
          value: v,
          type: TLVEntryType.Author,
          length: v.length,
        }) as TLVEntry,
    ),
  )
}

export class Nip17ChatSystem extends ExternalStore<Array<Chat>> implements ChatSystem {
  #cache: GiftWrapCache
  #seenEvents: Set<string> = new Set()

  constructor(cache: GiftWrapCache) {
    super()
    this.#cache = cache
    this.#cache.on("change", () => this.notifyChange())
  }

  subscription(session: LoginSession) {
    const pk = session.publicKey
    const rb = new RequestBuilder(`nip17:${pk?.slice(0, 12)}`)

    if (pk && !session.readonly) {
      rb.withOptions({ useSyncModule: true })
      rb.withFilter().kinds([EventKind.GiftWrap]).tag("p", [pk])
    }
    return rb
  }

  async processEvents(pub: EventPublisher, evs: Array<TaggedNostrEvent>) {
    const evsProcess = evs.filter(a => !this.#seenEvents.has(a.id) && !this.#cache.keysOnTable().includes(a.id))
    await this.#cache.onEvent(evsProcess, "", pub)
    for (const a of evsProcess) {
      this.#seenEvents.add(a.id)
    }
  }

  listChats(pk: string): Chat[] {
    const evs = this.#nip24Events()
    const messages = evs.filter(a => a.to === pk)

    const chatMap = new Map<string, UnwrappedGift[]>()
    for (const m of messages) {
      const id = computeChatId(m, pk)
      if (!id) continue
      const existing = chatMap.get(id)
      if (existing) {
        existing.push(m)
      } else {
        chatMap.set(id, [m])
      }
    }

    return [...chatMap.entries()].map(([id, chatMessages]) => {
      return Nip17ChatSystem.createChatObj(id, chatMessages, this.#cache)
    })
  }

  static createChatObj(id: string, messages: Array<UnwrappedGift>, cache?: GiftWrapCache) {
    const last = lastReadInChat(id)
    const participants = decodeTLV(id)
      .filter(v => v.type === TLVEntryType.Author)
      .map(v => ({
        type: "pubkey" as const,
        id: v.value as string,
      }))
    let bestTitle: string | undefined
    let bestTitleTime = 0
    let unread = 0
    let lastMessage = 0
    for (const v of messages) {
      const sbj = v.tags?.find(a => a[0] === "subject")?.[1]
      if (v.created_at > bestTitleTime && sbj) {
        bestTitle = sbj
        bestTitleTime = v.created_at
      }
      if (v.inner.created_at > last) unread++
      if (v.created_at > lastMessage) lastMessage = v.created_at
    }
    return {
      type: ChatType.PrivateDirectMessage,
      id,
      title: bestTitle,
      unread,
      lastMessage,
      participants,
      messages: messages.map(m => {
        const cached = getCachedDecryptedContent(m.id)
        return {
          id: m.id,
          created_at: m.inner.created_at,
          from: m.inner.pubkey,
          tags: m.tags,
          content: cached ?? "",
          needsDecryption: cached === undefined,
          decrypt: async (pub: EventPublisher) => {
            return await pub.decryptDm(m.inner)
          },
        }
      }),
      createMessage: async (msg: string, pub: EventPublisher) => {
        const gossip = pub.createUnsigned(EventKind.ChatRumor, msg, eb => {
          for (const pt of participants) {
            eb.tag(["p", pt.id])
          }
          return eb
        })
        const outMessages: Array<Promise<NostrEvent>> = []
        const powTarget = 4 * 4
        for (const pt of participants) {
          outMessages.push(pub.giftWrap(await pub.sealRumor(gossip, pt.id), pt.id, powTarget))
        }
        outMessages.push(pub.giftWrap(await pub.sealRumor(gossip, pub.pubKey), pub.pubKey, powTarget, GetPowWorker()))
        const ret = await Promise.all(outMessages)
        if (cache) {
          await cache.onEvent(
            ret.map(a => ({ ...a, relays: [] })),
            "",
            pub,
          )
        }
        return ret
      },
      sendMessage: (ev: Array<NostrEvent>, system: { BroadcastEvent: (e: NostrEvent) => void }) => {
        for (const a of ev) {
          system.BroadcastEvent(a)
        }
      },
      markRead: (msgId?: string) => {
        const msg = messages.find(a => a.id === msgId)
        setLastReadIn(id, msg?.inner.created_at)
        Nip17Chats.notifyChange()
      },
    } as Chat
  }

  takeSnapshot(p: string): Chat[] {
    return this.listChats(p)
  }

  #nip24Events() {
    const sn = this.#cache.snapshot()
    return sn.filter(a => a.inner.kind === EventKind.SealedRumor)
  }
}

export const Nip17Chats = new Nip17ChatSystem(GiftsCache)
