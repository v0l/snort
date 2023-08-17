import { ExternalStore, FeedCache, dedupe } from "@snort/shared";
import {
  EventKind,
  NostrEvent,
  NostrPrefix,
  RequestBuilder,
  SystemInterface,
  TLVEntryType,
  decodeTLV,
  encodeTLVEntries,
} from "@snort/system";
import { Chat, ChatSystem, ChatType, inChatWith, lastReadInChat, selfChat } from "chat";
import { debug } from "debug";

export class Nip4ChatSystem extends ExternalStore<Array<Chat>> implements ChatSystem {
  #cache: FeedCache<NostrEvent>;
  #log = debug("NIP-04");

  constructor(cache: FeedCache<NostrEvent>) {
    super();
    this.#cache = cache;
  }

  async onEvent(evs: Array<NostrEvent>) {
    const dms = evs.filter(a => a.kind === EventKind.DirectMessage);
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
      0
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
    const chatId = (a: NostrEvent) => {
      return encodeTLVEntries("chat4" as NostrPrefix, {
        type: TLVEntryType.Author,
        value: inChatWith(a, pk),
        length: 0,
      });
    };

    return dedupe(myDms.map(chatId)).map(a => {
      const messages = myDms.filter(b => chatId(b) === a);
      return Nip4ChatSystem.createChatObj(a, messages);
    });
  }

  static createChatObj(id: string, messages: Array<NostrEvent>) {
    const last = lastReadInChat(id);
    const pk = decodeTLV(id).find(a => a.type === TLVEntryType.Author)?.value as string;
    return {
      type: ChatType.DirectMessage,
      id,
      unread: messages.reduce((acc, v) => (v.created_at > last ? acc++ : acc), 0),
      lastMessage: messages.reduce((acc, v) => (v.created_at > acc ? v.created_at : acc), 0),
      participants: [
        {
          type: "pubkey",
          id: pk,
        },
      ],
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
        return [await pub.sendDm(msg, pk)];
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
