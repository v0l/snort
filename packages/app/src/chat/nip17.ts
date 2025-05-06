import { dedupe, ExternalStore } from "@snort/shared";
import {
  decodeTLV,
  encodeTLVEntries,
  EventKind,
  EventPublisher,
  NostrEvent,
  NostrPrefix,
  RequestBuilder,
  TaggedNostrEvent,
  TLVEntry,
  TLVEntryType,
} from "@snort/system";

import { GiftsCache } from "@/Cache";
import { GiftWrapCache } from "@/Cache/GiftWrapCache";
import { Chat, ChatSystem, ChatType, lastReadInChat, setLastReadIn } from "@/chat";
import { UnwrappedGift } from "@/Db";
import { LoginSession } from "@/Utils/Login";
import { GetPowWorker } from "@/Utils/wasm";

export class Nip17ChatSystem extends ExternalStore<Array<Chat>> implements ChatSystem {
  #cache: GiftWrapCache;
  #seenEvents: Set<string> = new Set();

  constructor(cache: GiftWrapCache) {
    super();
    this.#cache = cache;
    this.#cache.on("change", () => this.notifyChange());
  }

  subscription(session: LoginSession) {
    const pk = session.publicKey;
    const rb = new RequestBuilder(`nip17:${pk?.slice(0, 12)}`);

    if (pk && !session.readonly) {
      rb.withFilter().kinds([EventKind.GiftWrap]).tag("p", [pk]);
    }
    return rb;
  }

  async processEvents(pub: EventPublisher, evs: Array<TaggedNostrEvent>) {
    const evsPrcess = evs.filter(a => !this.#seenEvents.has(a.id) && !this.#cache.keysOnTable().includes(a.id));
    await this.#cache.onEvent(evsPrcess, "", pub);
    evsPrcess.forEach(a => this.#seenEvents.add(a.id));
  }

  listChats(pk: string): Chat[] {
    const evs = this.#nip24Events();
    const messages = evs.filter(a => a.to === pk);
    const chatId = (u: UnwrappedGift) => {
      const pTags = dedupe([...(u.tags ?? []).filter(a => a[0] === "p").map(a => a[1]), u.inner.pubkey])
        .sort()
        .filter(a => a !== pk);

      return encodeTLVEntries(
        NostrPrefix.Chat17,
        ...pTags.map(
          v =>
            ({
              value: v,
              type: TLVEntryType.Author,
              length: v.length,
            }) as TLVEntry,
        ),
      );
    };
    return dedupe(messages.map(a => chatId(a))).map(a => {
      const chatMessages = messages.filter(b => chatId(b) === a);
      return Nip17ChatSystem.createChatObj(a, chatMessages);
    });
  }

  static createChatObj(id: string, messages: Array<UnwrappedGift>) {
    const last = lastReadInChat(id);
    const participants = decodeTLV(id)
      .filter(v => v.type === TLVEntryType.Author)
      .map(v => ({
        type: "pubkey",
        id: v.value as string,
      }));
    const title = messages.reduce(
      (acc, v) => {
        const sbj = v.tags?.find(a => a[0] === "subject")?.[1];
        if (v.created_at > acc.t && sbj) {
          acc.title = sbj;
          acc.t = v.created_at;
        }
        return acc;
      },
      {
        t: 0,
        title: undefined,
      } as {
        t: number;
        title: string | undefined;
      },
    );
    return {
      type: ChatType.PrivateDirectMessage,
      id,
      title: title.title,
      unread: messages.reduce((acc, v) => (v.inner.created_at > last ? acc + 1 : acc), 0),
      lastMessage: messages.reduce((acc, v) => (v.inner.created_at > acc ? v.created_at : acc), 0),
      participants,
      messages: messages.map(m => ({
        id: m.id,
        created_at: m.inner.created_at,
        from: m.inner.pubkey,
        tags: m.tags,
        content: "",
        needsDecryption: true,
        decrypt: async pub => {
          return await pub.decryptDm(m.inner);
        },
      })),
      createMessage: async (msg, pub) => {
        const gossip = pub.createUnsigned(EventKind.ChatRumor, msg, eb => {
          for (const pt of participants) {
            eb.tag(["p", pt.id]);
          }
          return eb;
        });
        const messages: Array<Promise<NostrEvent>> = [];
        const powTarget = 4 * 4; // 4-char zero
        for (const pt of participants) {
          const recvSealedN = pub.giftWrap(await pub.sealRumor(gossip, pt.id), pt.id, powTarget);
          messages.push(recvSealedN);
        }
        messages.push(pub.giftWrap(await pub.sealRumor(gossip, pub.pubKey), pub.pubKey, powTarget, GetPowWorker()));
        const ret = await Promise.all(messages);
        Nip17Chats.notifyChange();
        return ret;
      },
      sendMessage: (ev, system) => {
        ev.forEach(a => system.BroadcastEvent(a));
      },
      markRead: msgId => {
        const msg = messages.find(a => a.id === msgId);
        setLastReadIn(id, msg?.inner.created_at);
        Nip17Chats.notifyChange();
      },
    } as Chat;
  }

  takeSnapshot(p: string): Chat[] {
    return this.listChats(p);
  }

  #nip24Events() {
    const sn = this.#cache.snapshot();
    return sn.filter(a => a.inner.kind === EventKind.SealedRumor);
  }
}

export const Nip17Chats = new Nip17ChatSystem(GiftsCache);
