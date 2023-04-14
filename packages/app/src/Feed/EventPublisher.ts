import { useMemo } from "react";
import * as secp from "@noble/secp256k1";
import { EventKind, RelaySettings, TaggedRawEvent, HexKey, RawEvent, u256, UserMetadata, Lists } from "@snort/nostr";

import { bech32ToHex, delay, unwrap } from "Util";
import { DefaultRelays, HashtagRegex } from "Const";
import { System } from "System";
import { EventExt } from "System/EventExt";
import useLogin from "Hooks/useLogin";

declare global {
  interface Window {
    nostr: {
      getPublicKey: () => Promise<HexKey>;
      signEvent: (event: RawEvent) => Promise<RawEvent>;
      getRelays: () => Promise<Record<string, { read: boolean; write: boolean }>>;
      nip04: {
        encrypt: (pubkey: HexKey, content: string) => Promise<string>;
        decrypt: (pubkey: HexKey, content: string) => Promise<string>;
      };
    };
  }
}

export type EventPublisher = ReturnType<typeof useEventPublisher>;

export default function useEventPublisher() {
  const { publicKey: pubKey, privateKey: privKey, follows, relays } = useLogin();
  const hasNip07 = "nostr" in window;

  async function signEvent(ev: RawEvent): Promise<RawEvent> {
    if (!pubKey) {
      throw new Error("Cant sign events when logged out");
    }

    if (hasNip07 && !privKey) {
      ev.id = await EventExt.createId(ev);
      const tmpEv = (await barrierNip07(() => window.nostr.signEvent(ev))) as RawEvent;
      ev.sig = tmpEv.sig;
      return ev;
    } else if (privKey) {
      await EventExt.sign(ev, privKey);
    } else {
      console.warn("Count not sign event, no private keys available");
    }
    return ev;
  }

  function processContent(ev: RawEvent, msg: string) {
    const replaceNpub = (match: string) => {
      const npub = match.slice(1);
      try {
        const hex = bech32ToHex(npub);
        const idx = ev.tags.length;
        ev.tags.push(["p", hex]);
        return `#[${idx}]`;
      } catch (error) {
        return match;
      }
    };
    const replaceNoteId = (match: string) => {
      const noteId = match.slice(1);
      try {
        const hex = bech32ToHex(noteId);
        const idx = ev.tags.length;
        ev.tags.push(["e", hex, "", "mention"]);
        return `#[${idx}]`;
      } catch (error) {
        return match;
      }
    };
    const replaceHashtag = (match: string) => {
      const tag = match.slice(1);
      ev.tags.push(["t", tag.toLowerCase()]);
      return match;
    };
    const content = msg
      .replace(/@npub[a-z0-9]+/g, replaceNpub)
      .replace(/@note1[acdefghjklmnpqrstuvwxyz023456789]{58}/g, replaceNoteId)
      .replace(HashtagRegex, replaceHashtag);
    ev.content = content;
  }

  const ret = {
    nip42Auth: async (challenge: string, relay: string) => {
      if (pubKey) {
        const ev = EventExt.forPubKey(pubKey, EventKind.Auth);
        ev.tags.push(["relay", relay]);
        ev.tags.push(["challenge", challenge]);
        return await signEvent(ev);
      }
    },
    broadcast: (ev: RawEvent | undefined) => {
      if (ev) {
        console.debug(ev);
        System.BroadcastEvent(ev);
      }
    },
    /**
     * Write event to DefaultRelays, this is important for profiles / relay lists to prevent bugs
     * If a user removes all the DefaultRelays from their relay list and saves that relay list,
     * When they open the site again we wont see that updated relay list and so it will appear to reset back to the previous state
     */
    broadcastForBootstrap: (ev: RawEvent | undefined) => {
      if (ev) {
        for (const [k] of DefaultRelays) {
          System.WriteOnceToRelay(k, ev);
        }
      }
    },
    /**
     * Write event to all given relays.
     */
    broadcastAll: (ev: RawEvent | undefined, relays: string[]) => {
      if (ev) {
        for (const k of relays) {
          System.WriteOnceToRelay(k, ev);
        }
      }
    },
    muted: async (keys: HexKey[], priv: HexKey[]) => {
      if (pubKey) {
        const ev = EventExt.forPubKey(pubKey, EventKind.PubkeyLists);
        ev.tags.push(["d", Lists.Muted]);
        keys.forEach(p => {
          ev.tags.push(["p", p]);
        });
        let content = "";
        if (priv.length > 0) {
          const ps = priv.map(p => ["p", p]);
          const plaintext = JSON.stringify(ps);
          if (hasNip07 && !privKey) {
            content = await barrierNip07(() => window.nostr.nip04.encrypt(pubKey, plaintext));
          } else if (privKey) {
            content = await EventExt.encryptData(plaintext, pubKey, privKey);
          }
        }
        ev.content = content;
        return await signEvent(ev);
      }
    },
    pinned: async (notes: HexKey[]) => {
      if (pubKey) {
        const ev = EventExt.forPubKey(pubKey, EventKind.NoteLists);
        ev.tags.push(["d", Lists.Pinned]);
        notes.forEach(n => {
          ev.tags.push(["e", n]);
        });
        return await signEvent(ev);
      }
    },
    bookmarked: async (notes: HexKey[]) => {
      if (pubKey) {
        const ev = EventExt.forPubKey(pubKey, EventKind.NoteLists);
        ev.tags.push(["d", Lists.Bookmarked]);
        notes.forEach(n => {
          ev.tags.push(["e", n]);
        });
        return await signEvent(ev);
      }
    },
    tags: async (tags: string[]) => {
      if (pubKey) {
        const ev = EventExt.forPubKey(pubKey, EventKind.TagLists);
        ev.tags.push(["d", Lists.Followed]);
        tags.forEach(t => {
          ev.tags.push(["t", t]);
        });
        return await signEvent(ev);
      }
    },
    metadata: async (obj: UserMetadata) => {
      if (pubKey) {
        const ev = EventExt.forPubKey(pubKey, EventKind.SetMetadata);
        ev.content = JSON.stringify(obj);
        return await signEvent(ev);
      }
    },
    note: async (msg: string, extraTags?: Array<Array<string>>, kind?: EventKind) => {
      if (pubKey) {
        const ev = EventExt.forPubKey(pubKey, kind ?? EventKind.TextNote);
        processContent(ev, msg);
        if (extraTags) {
          for (const et of extraTags) {
            ev.tags.push(et);
          }
        }
        return await signEvent(ev);
      }
    },
    /**
     * Create a zap request event for a given target event/profile
     * @param amount Millisats amout!
     * @param author Author pubkey to tag in the zap
     * @param note Note Id to tag in the zap
     * @param msg Custom message to be included in the zap
     * @param extraTags Any extra tags to include on the zap request event
     * @returns
     */
    zap: async (amount: number, author: HexKey, note?: HexKey, msg?: string, extraTags?: Array<Array<string>>) => {
      if (pubKey) {
        const ev = EventExt.forPubKey(pubKey, EventKind.ZapRequest);
        if (note) {
          ev.tags.push(["e", note]);
        }
        ev.tags.push(["p", author]);
        const relayTag = ["relays", ...Object.keys(relays).map(a => a.trim())];
        ev.tags.push(relayTag);
        ev.tags.push(["amount", amount.toString()]);
        ev.tags.push(...(extraTags ?? []));
        processContent(ev, msg || "");
        return await signEvent(ev);
      }
    },
    /**
     * Reply to a note
     */
    reply: async (replyTo: TaggedRawEvent, msg: string, extraTags?: Array<Array<string>>, kind?: EventKind) => {
      if (pubKey) {
        const ev = EventExt.forPubKey(pubKey, kind ?? EventKind.TextNote);

        const thread = EventExt.extractThread(ev);
        if (thread) {
          if (thread.root || thread.replyTo) {
            ev.tags.push(["e", thread.root?.Event ?? thread.replyTo?.Event ?? "", "", "root"]);
          }
          ev.tags.push(["e", replyTo.id, replyTo.relays[0] ?? "", "reply"]);

          // dont tag self in replies
          if (replyTo.pubkey !== pubKey) {
            ev.tags.push(["p", replyTo.pubkey]);
          }

          for (const pk of thread.pubKeys) {
            if (pk === pubKey) {
              continue; // dont tag self in replies
            }
            ev.tags.push(["p", pk]);
          }
        } else {
          ev.tags.push(["e", replyTo.id, "", "reply"]);
          // dont tag self in replies
          if (replyTo.pubkey !== pubKey) {
            ev.tags.push(["p", replyTo.pubkey]);
          }
        }
        processContent(ev, msg);
        if (extraTags) {
          for (const et of extraTags) {
            ev.tags.push(et);
          }
        }
        return await signEvent(ev);
      }
    },
    react: async (evRef: RawEvent, content = "+") => {
      if (pubKey) {
        const ev = EventExt.forPubKey(pubKey, EventKind.Reaction);
        ev.content = content;
        ev.tags.push(["e", evRef.id]);
        ev.tags.push(["p", evRef.pubkey]);
        return await signEvent(ev);
      }
    },
    saveRelays: async () => {
      if (pubKey) {
        const ev = EventExt.forPubKey(pubKey, EventKind.ContactList);
        ev.content = JSON.stringify(relays);
        for (const pk of follows.item) {
          ev.tags.push(["p", pk]);
        }

        return await signEvent(ev);
      }
    },
    saveRelaysSettings: async () => {
      if (pubKey) {
        const ev = EventExt.forPubKey(pubKey, EventKind.Relays);
        for (const [url, settings] of Object.entries(relays)) {
          const rTag = ["r", url];
          if (settings.read && !settings.write) {
            rTag.push("read");
          }
          if (settings.write && !settings.read) {
            rTag.push("write");
          }
          ev.tags.push(rTag);
        }
        return await signEvent(ev);
      }
    },
    addFollow: async (pkAdd: HexKey | HexKey[], newRelays?: Record<string, RelaySettings>) => {
      if (pubKey) {
        const ev = EventExt.forPubKey(pubKey, EventKind.ContactList);
        ev.content = JSON.stringify(newRelays ?? relays);
        const temp = new Set(follows.item);
        if (Array.isArray(pkAdd)) {
          pkAdd.forEach(a => temp.add(a));
        } else {
          temp.add(pkAdd);
        }
        for (const pk of temp) {
          if (pk.length !== 64) {
            continue;
          }
          ev.tags.push(["p", pk.toLowerCase()]);
        }

        return await signEvent(ev);
      }
    },
    removeFollow: async (pkRemove: HexKey) => {
      if (pubKey) {
        const ev = EventExt.forPubKey(pubKey, EventKind.ContactList);
        ev.content = JSON.stringify(relays);
        for (const pk of follows.item) {
          if (pk === pkRemove || pk.length !== 64) {
            continue;
          }
          ev.tags.push(["p", pk]);
        }

        return await signEvent(ev);
      }
    },
    /**
     * Delete an event (NIP-09)
     */
    delete: async (id: u256) => {
      if (pubKey) {
        const ev = EventExt.forPubKey(pubKey, EventKind.Deletion);
        ev.tags.push(["e", id]);
        return await signEvent(ev);
      }
    },
    /**
     * Repost a note (NIP-18)
     */
    repost: async (note: TaggedRawEvent) => {
      if (pubKey) {
        const ev = EventExt.forPubKey(pubKey, EventKind.Repost);
        ev.tags.push(["e", note.id, ""]);
        ev.tags.push(["p", note.pubkey]);
        return await signEvent(ev);
      }
    },
    decryptDm: async (note: RawEvent): Promise<string | undefined> => {
      if (pubKey) {
        if (note.pubkey !== pubKey && !note.tags.some(a => a[1] === pubKey)) {
          return "<CANT DECRYPT>";
        }
        try {
          const otherPubKey = note.pubkey === pubKey ? unwrap(note.tags.find(a => a[0] === "p")?.[1]) : note.pubkey;
          if (hasNip07 && !privKey) {
            return await barrierNip07(() => window.nostr.nip04.decrypt(otherPubKey, note.content));
          } else if (privKey) {
            return await EventExt.decryptDm(note.content, privKey, otherPubKey);
          }
        } catch (e) {
          console.error("Decryption failed", e);
          return "<DECRYPTION FAILED>";
        }
      }
    },
    sendDm: async (content: string, to: HexKey) => {
      if (pubKey) {
        const ev = EventExt.forPubKey(pubKey, EventKind.DirectMessage);
        ev.content = content;
        ev.tags.push(["p", to]);

        try {
          if (hasNip07 && !privKey) {
            const cx: string = await barrierNip07(() => window.nostr.nip04.encrypt(to, content));
            ev.content = cx;
            return await signEvent(ev);
          } else if (privKey) {
            ev.content = await EventExt.encryptData(content, to, privKey);
            return await signEvent(ev);
          }
        } catch (e) {
          console.error("Encryption failed", e);
        }
      }
    },
    newKey: () => {
      const privKey = secp.utils.bytesToHex(secp.utils.randomPrivateKey());
      const pubKey = secp.utils.bytesToHex(secp.schnorr.getPublicKey(privKey));
      return {
        privateKey: privKey,
        publicKey: pubKey,
      };
    },
    generic: async (content: string, kind: EventKind, tags?: Array<Array<string>>) => {
      if (pubKey) {
        const ev = EventExt.forPubKey(pubKey, kind);
        ev.content = content;
        ev.tags = tags ?? [];
        return await signEvent(ev);
      }
    },
  };

  return useMemo(() => ret, [pubKey, relays, follows]);
}

let isNip07Busy = false;

export const barrierNip07 = async <T>(then: () => Promise<T>): Promise<T> => {
  while (isNip07Busy) {
    await delay(10);
  }
  isNip07Busy = true;
  try {
    return await then();
  } finally {
    isNip07Busy = false;
  }
};
