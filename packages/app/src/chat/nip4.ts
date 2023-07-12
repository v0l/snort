import { ExternalStore, FeedCache, dedupe } from "@snort/shared";
import { EventKind, NostrEvent, RequestBuilder, SystemInterface } from "@snort/system";
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
    return dedupe(myDms.map(a => inChatWith(a, pk))).map(a => {
      const messages = myDms.filter(
        b => (a === pk && selfChat(b, pk)) || (!selfChat(b, pk) && inChatWith(b, pk) === a)
      );
      return Nip4ChatSystem.createChatObj(a, messages);
    });
  }

  static createChatObj(id: string, messages: Array<NostrEvent>) {
    const last = lastReadInChat(id);
    return {
      type: ChatType.DirectMessage,
      id,
      unread: messages.reduce((acc, v) => (v.created_at > last ? acc++ : acc), 0),
      lastMessage: messages.reduce((acc, v) => (v.created_at > acc ? v.created_at : acc), 0),
      messages,
      createMessage: (msg, pub) => {
        return pub.sendDm(msg, id);
      },
      sendMessage: (ev: NostrEvent, system: SystemInterface) => {
        system.BroadcastEvent(ev);
      },
    } as Chat;
  }

  #nip4Events() {
    return this.#cache.snapshot().filter(a => a.kind === EventKind.DirectMessage);
  }
}
