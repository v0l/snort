import { ExternalStore, FeedCache } from "@snort/shared";
import {
  EventKind,
  NostrEvent,
  NostrPrefix,
  RequestBuilder,
  SystemInterface,
  TLVEntryType,
  encodeTLVEntries,
  TaggedNostrEvent,
  decodeTLV,
} from "@snort/system";
import { Chat, ChatSystem, ChatType, inChatWith, lastReadInChat } from "chat";
import { debug } from "debug";

export class Nip4ChatSystem extends ExternalStore<Array<Chat>> implements ChatSystem {
  #cache: FeedCache<NostrEvent>;
  #log = debug("NIP-04");

  constructor(cache: FeedCache<NostrEvent>) {
    super();
    this.#cache = cache;
  }

  async onEvent(evs: readonly TaggedNostrEvent[]) {
    const dms = evs.filter(a => a.kind === EventKind.DirectMessage && a.tags.some(b => b[0] === "p"));
    if (dms.length > 0) {
      await this.#cache.bulkSet(dms);
      this.notifyChange();
    }
  }

  subscription(pk: string) {
    const rb = new RequestBuilder(`nip4:${pk.slice(0, 12)}`);
    const dms = this.#cache.snapshot();
    const dmSince = dms.reduce(
      (acc, v) => (v.created_at > acc && v.kind === EventKind.DirectMessage ? (acc = v.created_at) : acc),
      0,
    );

    this.#log("Loading DMS since %s", new Date(dmSince * 1000));
    rb.withFilter().authors([pk]).kinds([EventKind.DirectMessage]).since(dmSince);
    rb.withFilter().kinds([EventKind.DirectMessage]).tag("p", [pk]).since(dmSince);
    return rb;
  }

  takeSnapshot(p: string) {
    return this.listChats(p);
  }

  listChats(pk: string): Chat[] {
    const myDms = this.#nip4Events();
    const chats = myDms.reduce(
      (acc, v) => {
        const chatId = inChatWith(v, pk);
        acc[chatId] ??= [];
        acc[chatId].push(v);
        return acc;
      },
      {} as Record<string, Array<NostrEvent>>,
    );

    return [...Object.entries(chats)].map(([k, v]) =>
      Nip4ChatSystem.createChatObj(
        encodeTLVEntries("chat4" as NostrPrefix, {
          type: TLVEntryType.Author,
          value: k,
          length: 32,
        }),
        v,
      ),
    );
  }

  static createChatObj(id: string, messages: Array<NostrEvent>) {
    const last = lastReadInChat(id);
    const participants = decodeTLV(id)
      .filter(v => v.type === TLVEntryType.Author)
      .map(v => ({
        type: "pubkey",
        id: v.value as string,
      }));
    return {
      type: ChatType.DirectMessage,
      id,
      unread: messages.reduce((acc, v) => (v.created_at > last ? acc++ : acc), 0),
      lastMessage: messages.reduce((acc, v) => (v.created_at > acc ? v.created_at : acc), 0),
      participants,
      messages: messages.map(m => ({
        id: m.id,
        created_at: m.created_at,
        from: m.pubkey,
        tags: m.tags,
        content: "",
        needsDecryption: true,
        decrypt: async pub => {
          return await pub.decryptDm(m);
        },
      })),
      createMessage: async (msg, pub) => {
        return await Promise.all(participants.map(v => pub.sendDm(msg, v.id)));
      },
      sendMessage: (ev, system: SystemInterface) => {
        ev.forEach(a => system.BroadcastEvent(a));
      },
    } as Chat;
  }

  #nip4Events() {
    return this.#cache.snapshot().filter(a => a.kind === EventKind.DirectMessage);
  }
}
