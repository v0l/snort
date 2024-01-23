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
} from "@snort/system";

import { Chat, ChatSystem, ChatType, inChatWith, lastReadInChat } from "@/chat";
import { LoginSession } from "@/Utils/Login";

export class Nip4ChatSystem implements ChatSystem {
  subscription(session: LoginSession) {
    const pk = session.publicKey;
    if (!pk || session.readonly) return;

    const rb = new RequestBuilder(`nip4:${pk.slice(0, 12)}`);
    rb.withFilter().authors([pk]).kinds([EventKind.DirectMessage]);
    rb.withFilter().kinds([EventKind.DirectMessage]).tag("p", [pk]);
    return rb;
  }

  listChats(pk: string, evs: Array<TaggedNostrEvent>): Chat[] {
    const myDms = this.#nip4Events(evs);
    const chats = myDms.reduce(
      (acc, v) => {
        const chatId = inChatWith(v, pk);
        acc[chatId] ??= [];
        acc[chatId].push(v);
        return acc;
      },
      {} as Record<string, Array<NostrEvent>>,
    );

    return [...Object.entries(chats)].map(([k, v]) => Nip4ChatSystem.createChatObj(Nip4ChatSystem.makeChatId(k), v));
  }

  static makeChatId(pubkey: string) {
    return encodeTLVEntries("chat4" as NostrPrefix, {
      type: TLVEntryType.Author,
      value: pubkey,
      length: 32,
    });
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

  #nip4Events(evs: Array<TaggedNostrEvent>) {
    return evs.filter(a => a.kind === EventKind.DirectMessage);
  }
}

export const Nip4Chats = new Nip4ChatSystem();
