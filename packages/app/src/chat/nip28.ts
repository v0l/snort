import { unwrap } from "@snort/shared";
import {
  decodeTLV,
  encodeTLVEntries,
  EventKind,
  NostrEvent,
  NostrPrefix,
  RequestBuilder,
  SystemInterface,
  TaggedNostrEvent,
  TLVEntryType,
  UserMetadata,
} from "@snort/system";

import { Chat, ChatParticipant, ChatSystem, ChatType, lastReadInChat } from "@/chat";
import { findTag } from "@/Utils";
import { LoginSession } from "@/Utils/Login";

export class Nip28ChatSystem implements ChatSystem {
  readonly ChannelKinds = [
    EventKind.PublicChatChannel,
    EventKind.PublicChatMessage,
    EventKind.PublicChatMetadata,
    EventKind.PublicChatMuteMessage,
    EventKind.PublicChatMuteUser,
  ];

  subscription(session: LoginSession): RequestBuilder | undefined {
    const chats = (session.extraChats ?? []).filter(a => a.startsWith("chat281"));
    if (chats.length === 0) return;

    const chatId = (v: string) => unwrap(decodeTLV(v).find(a => a.type === TLVEntryType.Special)).value as string;

    const rb = new RequestBuilder(`nip28:${session.id}`);
    rb.withFilter()
      .ids(chats.map(v => chatId(v)))
      .kinds([EventKind.PublicChatChannel, EventKind.PublicChatMetadata]);
    for (const c of chats) {
      const id = chatId(c);
      rb.withFilter().tag("e", [id]).kinds(this.ChannelKinds);
    }

    return rb;
  }

  listChats(pk: string, evs: Array<TaggedNostrEvent>): Chat[] {
    const chats = this.#chatChannels(evs);
    const ret = Object.entries(chats).map(([k, v]) => {
      return Nip28ChatSystem.createChatObj(Nip28ChatSystem.chatId(k), v);
    });
    return ret;
  }

  static chatId(id: string) {
    return encodeTLVEntries("chat28" as NostrPrefix, {
      type: TLVEntryType.Special,
      value: id,
      length: id.length,
    });
  }

  static createChatObj(id: string, messages: Array<NostrEvent>) {
    const last = lastReadInChat(id);
    const participants = decodeTLV(id)
      .filter(v => v.type === TLVEntryType.Special)
      .map(
        v =>
          ({
            type: "generic",
            id: v.value as string,
            profile: this.#chatProfileFromMessages(messages),
          }) as ChatParticipant,
      );
    return {
      type: ChatType.PublicGroupChat,
      id,
      unread: messages.reduce((acc, v) => (v.created_at > last ? acc++ : acc), 0),
      lastMessage: messages.reduce((acc, v) => (v.created_at > acc ? v.created_at : acc), 0),
      participants,
      messages: messages
        .filter(a => a.kind === EventKind.PublicChatMessage)
        .map(m => ({
          id: m.id,
          created_at: m.created_at,
          from: m.pubkey,
          tags: m.tags,
          content: m.content,
          needsDecryption: false,
        })),
      createMessage: async (msg, pub) => {
        return [
          await pub.generic(eb => {
            return eb.kind(EventKind.PublicChatMessage).content(msg).tag(["e", participants[0].id, "", "root"]);
          }),
        ];
      },
      sendMessage: (ev, system: SystemInterface) => {
        ev.forEach(a => system.BroadcastEvent(a));
      },
    } as Chat;
  }

  static #chatProfileFromMessages(messages: Array<NostrEvent>) {
    const chatDefs = messages.filter(
      a => a.kind === EventKind.PublicChatChannel || a.kind === EventKind.PublicChatMetadata,
    );
    const chatDef =
      chatDefs.length > 0
        ? chatDefs.reduce((acc, v) => (acc.created_at > v.created_at ? acc : v), chatDefs[0])
        : undefined;
    return chatDef ? (JSON.parse(chatDef.content) as UserMetadata) : undefined;
  }

  #chatChannels(evs: Array<TaggedNostrEvent>) {
    const chats = evs.reduce(
      (acc, v) => {
        const k = this.#chatId(v);
        if (k) {
          acc[k] ??= [];
          acc[k].push(v);
        }
        return acc;
      },
      {} as Record<string, Array<NostrEvent>>,
    );
    return chats;
  }

  #chatId(ev: NostrEvent) {
    if (ev.kind === EventKind.PublicChatChannel) {
      return ev.id;
    } else if (ev.kind === EventKind.PublicChatMetadata) {
      return findTag(ev, "e");
    } else if (this.ChannelKinds.includes(ev.kind)) {
      return ev.tags.find(a => a[0] === "e" && a[3] === "root")?.[1];
    }
  }
}

export const Nip28Chats = new Nip28ChatSystem();
