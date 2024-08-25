import { dedupe, ExternalStore, FeedCache, removeUndefined } from "@snort/shared";
import {
  EventKind,
  NostrEvent,
  RequestBuilder,
  SystemInterface,
  TaggedNostrEvent,
} from "@snort/system";

import { Chat, ChatSystem, ChatType, lastReadInChat } from "@/chat";
import { LoginSession } from "@/Utils/Login";

export class Nip29ChatSystem extends ExternalStore<Array<Chat>> implements ChatSystem {
  readonly #cache: FeedCache<NostrEvent>;

  constructor(cache: FeedCache<NostrEvent>) {
    super();
    this.#cache = cache;
  }

  processEvents(): Promise<void> {
    return Promise.resolve();
  }

  takeSnapshot(): Chat[] {
    return this.listChats();
  }

  subscription(session: LoginSession) {
    const id = session.publicKey;
    if (!id) return;
    const gs = id.split("/", 2);
    const rb = new RequestBuilder(`nip29:${id}`);
    const last = this.listChats().find(a => a.id === id)?.lastMessage;
    rb.withFilter()
      .relay(`wss://${gs[0]}`)
      .kinds([EventKind.SimpleChatMessage])
      .tag("g", [`/${gs[1]}`])
      .since(last);
    rb.withFilter()
      .relay(`wss://${gs[0]}`)
      .kinds([EventKind.SimpleChatMetadata])
      .tag("d", [`/${gs[1]}`]);
    return rb;
  }

  async onEvent(evs: readonly TaggedNostrEvent[]) {
    const msg = evs.filter(a => a.kind === EventKind.SimpleChatMessage && a.tags.some(b => b[0] === "g"));
    if (msg.length > 0) {
      await this.#cache.bulkSet(msg);
      this.notifyChange();
    }
  }

  listChats(): Chat[] {
    const allMessages = this.#nip29Chats();
    const groups = dedupe(
      removeUndefined(allMessages.map(a => a.tags.find(b => b[0] === "g"))).map(a => `${a[2]}${a[1]}`),
    );
    return groups.map(g => {
      const [relay, channel] = g.split("/", 2);
      const messages = allMessages.filter(
        a => `${a.tags.find(b => b[0] === "g")?.[2]}${a.tags.find(b => b[0] === "g")?.[1]}` === g,
      );
      const lastRead = lastReadInChat(g);
      return {
        type: ChatType.PublicGroupChat,
        id: g,
        title: `${relay}/${channel}`,
        unread: messages.reduce((acc, v) => (v.created_at > lastRead ? acc++ : acc), 0),
        lastMessage: messages.reduce((acc, v) => (v.created_at > acc ? v.created_at : acc), 0),
        messages: messages.map(m => ({
          id: m.id,
          created_at: m.created_at,
          from: m.pubkey,
          tags: m.tags,
          needsDecryption: false,
          content: m.content,
          decrypt: async () => {
            return m.content;
          },
        })),
        participants: [
          {
            type: "generic",
            id: "",
            profile: {
              name: `${relay}/${channel}`,
            },
          },
        ],
        createMessage: async (msg, pub) => {
          return [
            await pub.generic(eb => {
              return eb
                .kind(EventKind.SimpleChatMessage)
                .tag(["g", `/${channel}`, relay])
                .content(msg);
            }),
          ];
        },
        sendMessage: async (ev, system: SystemInterface) => {
          ev.forEach(async a => {
            system.HandleEvent("*", { ...a, relays: [] });
            await system.WriteOnceToRelay(`wss://${relay}`, a);
          });
        },
      } as Chat;
    });
  }

  #nip29Chats() {
    return this.#cache.snapshot().filter(a => a.kind === EventKind.SimpleChatMessage);
  }
}
