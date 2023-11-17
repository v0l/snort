import { ExternalStore, dedupe } from "@snort/shared";
import { EventKind, NostrPrefix, encodeTLVEntries, TLVEntryType, TLVEntry, decodeTLV, NostrEvent } from "@snort/system";
import { GiftWrapCache } from "@/Cache/GiftWrapCache";
import { UnwrappedGift } from "@/Db";
import { Chat, ChatSystem, ChatType, lastReadInChat } from "@/chat";
import { GetPowWorker } from "@/index";

export class Nip24ChatSystem extends ExternalStore<Array<Chat>> implements ChatSystem {
  #cache: GiftWrapCache;

  constructor(cache: GiftWrapCache) {
    super();
    this.#cache = cache;
    this.#cache.hook(() => this.notifyChange(), "*");
  }

  subscription() {
    // ignored
    return undefined;
  }

  onEvent() {
    // ignored
  }

  listChats(pk: string): Chat[] {
    const evs = this.#nip24Events();
    const messages = evs.filter(a => a.to === pk);
    const chatId = (u: UnwrappedGift) => {
      const pTags = dedupe([...(u.tags ?? []).filter(a => a[0] === "p").map(a => a[1]), u.inner.pubkey])
        .sort()
        .filter(a => a !== pk);

      return encodeTLVEntries(
        "chat24" as NostrPrefix,
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
      return Nip24ChatSystem.createChatObj(a, chatMessages);
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
      unread: messages.reduce((acc, v) => (v.created_at > last ? acc++ : acc), 0),
      lastMessage: messages.reduce((acc, v) => (v.created_at > acc ? v.created_at : acc), 0),
      participants,
      messages: messages.map(m => ({
        id: m.id,
        created_at: m.created_at,
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
        return await Promise.all(messages);
      },
      sendMessage: (ev, system) => {
        ev.forEach(a => system.BroadcastEvent(a));
      },
    } as Chat;
  }

  takeSnapshot(p: string): Chat[] {
    return this.listChats(p);
  }

  #nip24Events() {
    const sn = this.#cache.takeSnapshot();
    return sn.filter(a => a.inner.kind === EventKind.SealedRumor);
  }
}
