import { useSelector } from "react-redux";

import { TaggedRawEvent } from "Nostr";
import { System } from "Nostr/System";
import { default as NEvent } from "Nostr/Event";
import EventKind from "Nostr/EventKind";
import Tag from "Nostr/Tag";
import { RootState } from "State/Store";
import { HexKey, RawEvent, u256, UserMetadata, Lists } from "Nostr";
import { bech32ToHex, unwrap } from "Util";
import { DefaultRelays, HashtagRegex } from "Const";
import { RelaySettings } from "Nostr/Connection";

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

export default function useEventPublisher() {
  const pubKey = useSelector<RootState, HexKey | undefined>(s => s.login.publicKey);
  const privKey = useSelector<RootState, HexKey | undefined>(s => s.login.privateKey);
  const follows = useSelector<RootState, HexKey[]>(s => s.login.follows);
  const relays = useSelector((s: RootState) => s.login.relays);
  const hasNip07 = "nostr" in window;

  async function signEvent(ev: NEvent): Promise<NEvent> {
    if (hasNip07 && !privKey) {
      ev.Id = await ev.CreateId();
      const tmpEv = (await barrierNip07(() => window.nostr.signEvent(ev.ToObject()))) as RawEvent;
      return new NEvent(tmpEv as TaggedRawEvent);
    } else if (privKey) {
      await ev.Sign(privKey);
    } else {
      console.warn("Count not sign event, no private keys available");
    }
    return ev;
  }

  function processContent(ev: NEvent, msg: string) {
    const replaceNpub = (match: string) => {
      const npub = match.slice(1);
      try {
        const hex = bech32ToHex(npub);
        const idx = ev.Tags.length;
        ev.Tags.push(new Tag(["p", hex], idx));
        return `#[${idx}]`;
      } catch (error) {
        return match;
      }
    };
    const replaceNoteId = (match: string) => {
      try {
        const hex = bech32ToHex(match);
        const idx = ev.Tags.length;
        ev.Tags.push(new Tag(["e", hex, "", "mention"], idx));
        return `#[${idx}]`;
      } catch (error) {
        return match;
      }
    };
    const replaceHashtag = (match: string) => {
      const tag = match.slice(1);
      const idx = ev.Tags.length;
      ev.Tags.push(new Tag(["t", tag.toLowerCase()], idx));
      return match;
    };
    const content = msg
      .replace(/@npub[a-z0-9]+/g, replaceNpub)
      .replace(/note[a-z0-9]+/g, replaceNoteId)
      .replace(HashtagRegex, replaceHashtag);
    ev.Content = content;
  }

  return {
    nip42Auth: async (challenge: string, relay: string) => {
      if (pubKey) {
        const ev = NEvent.ForPubKey(pubKey);
        ev.Kind = EventKind.Auth;
        ev.Content = "";
        ev.Tags.push(new Tag(["relay", relay], 0));
        ev.Tags.push(new Tag(["challenge", challenge], 1));
        return await signEvent(ev);
      }
    },
    broadcast: (ev: NEvent | undefined) => {
      if (ev) {
        console.debug("Sending event: ", ev);
        System.BroadcastEvent(ev);
      }
    },
    /**
     * Write event to DefaultRelays, this is important for profiles / relay lists to prevent bugs
     * If a user removes all the DefaultRelays from their relay list and saves that relay list,
     * When they open the site again we wont see that updated relay list and so it will appear to reset back to the previous state
     */
    broadcastForBootstrap: (ev: NEvent | undefined) => {
      if (ev) {
        for (const [k] of DefaultRelays) {
          System.WriteOnceToRelay(k, ev);
        }
      }
    },
    muted: async (keys: HexKey[], priv: HexKey[]) => {
      if (pubKey) {
        const ev = NEvent.ForPubKey(pubKey);
        ev.Kind = EventKind.Lists;
        ev.Tags.push(new Tag(["d", Lists.Muted], ev.Tags.length));
        keys.forEach(p => {
          ev.Tags.push(new Tag(["p", p], ev.Tags.length));
        });
        let content = "";
        if (priv.length > 0) {
          const ps = priv.map(p => ["p", p]);
          const plaintext = JSON.stringify(ps);
          if (hasNip07 && !privKey) {
            content = await barrierNip07(() => window.nostr.nip04.encrypt(pubKey, plaintext));
          } else if (privKey) {
            content = await ev.EncryptData(plaintext, pubKey, privKey);
          }
        }
        ev.Content = content;
        return await signEvent(ev);
      }
    },
    metadata: async (obj: UserMetadata) => {
      if (pubKey) {
        const ev = NEvent.ForPubKey(pubKey);
        ev.Kind = EventKind.SetMetadata;
        ev.Content = JSON.stringify(obj);
        return await signEvent(ev);
      }
    },
    note: async (msg: string) => {
      if (pubKey) {
        const ev = NEvent.ForPubKey(pubKey);
        ev.Kind = EventKind.TextNote;
        processContent(ev, msg);
        return await signEvent(ev);
      }
    },
    zap: async (author: HexKey, note?: HexKey, msg?: string) => {
      if (pubKey) {
        const ev = NEvent.ForPubKey(pubKey);
        ev.Kind = EventKind.ZapRequest;
        if (note) {
          ev.Tags.push(new Tag(["e", note], ev.Tags.length));
        }
        ev.Tags.push(new Tag(["p", author], ev.Tags.length));
        const relayTag = ["relays", ...Object.keys(relays).slice(0, 10)];
        ev.Tags.push(new Tag(relayTag, ev.Tags.length));
        processContent(ev, msg || "");
        return await signEvent(ev);
      }
    },
    /**
     * Reply to a note
     */
    reply: async (replyTo: NEvent, msg: string) => {
      if (pubKey) {
        const ev = NEvent.ForPubKey(pubKey);
        ev.Kind = EventKind.TextNote;

        const thread = replyTo.Thread;
        if (thread) {
          if (thread.Root || thread.ReplyTo) {
            ev.Tags.push(new Tag(["e", thread.Root?.Event ?? thread.ReplyTo?.Event ?? "", "", "root"], ev.Tags.length));
          }
          ev.Tags.push(new Tag(["e", replyTo.Id, "", "reply"], ev.Tags.length));

          // dont tag self in replies
          if (replyTo.PubKey !== pubKey) {
            ev.Tags.push(new Tag(["p", replyTo.PubKey], ev.Tags.length));
          }

          for (const pk of thread.PubKeys) {
            if (pk === pubKey) {
              continue; // dont tag self in replies
            }
            ev.Tags.push(new Tag(["p", pk], ev.Tags.length));
          }
        } else {
          ev.Tags.push(new Tag(["e", replyTo.Id, "", "reply"], 0));
          // dont tag self in replies
          if (replyTo.PubKey !== pubKey) {
            ev.Tags.push(new Tag(["p", replyTo.PubKey], ev.Tags.length));
          }
        }
        processContent(ev, msg);
        return await signEvent(ev);
      }
    },
    react: async (evRef: NEvent, content = "+") => {
      if (pubKey) {
        const ev = NEvent.ForPubKey(pubKey);
        ev.Kind = EventKind.Reaction;
        ev.Content = content;
        ev.Tags.push(new Tag(["e", evRef.Id], 0));
        ev.Tags.push(new Tag(["p", evRef.PubKey], 1));
        return await signEvent(ev);
      }
    },
    saveRelays: async () => {
      if (pubKey) {
        const ev = NEvent.ForPubKey(pubKey);
        ev.Kind = EventKind.ContactList;
        ev.Content = JSON.stringify(relays);
        for (const pk of follows) {
          ev.Tags.push(new Tag(["p", pk], ev.Tags.length));
        }

        return await signEvent(ev);
      }
    },
    saveRelaysSettings: async () => {
      if (pubKey) {
        const ev = NEvent.ForPubKey(pubKey);
        ev.Kind = EventKind.Relays;
        ev.Content = "";
        for (const [url, settings] of Object.entries(relays)) {
          const rTag = ["r", url];
          if (settings.read) {
            rTag.push("read");
          }
          if (settings.write) {
            rTag.push("write");
          }
          ev.Tags.push(new Tag(rTag, ev.Tags.length));
        }
        return await signEvent(ev);
      }
    },
    addFollow: async (pkAdd: HexKey | HexKey[], newRelays?: Record<string, RelaySettings>) => {
      if (pubKey) {
        const ev = NEvent.ForPubKey(pubKey);
        ev.Kind = EventKind.ContactList;
        ev.Content = JSON.stringify(newRelays ?? relays);
        const temp = new Set(follows);
        if (Array.isArray(pkAdd)) {
          pkAdd.forEach(a => temp.add(a));
        } else {
          temp.add(pkAdd);
        }
        for (const pk of temp) {
          if (pk.length !== 64) {
            continue;
          }
          ev.Tags.push(new Tag(["p", pk], ev.Tags.length));
        }

        return await signEvent(ev);
      }
    },
    removeFollow: async (pkRemove: HexKey) => {
      if (pubKey) {
        const ev = NEvent.ForPubKey(pubKey);
        ev.Kind = EventKind.ContactList;
        ev.Content = JSON.stringify(relays);
        for (const pk of follows) {
          if (pk === pkRemove || pk.length !== 64) {
            continue;
          }
          ev.Tags.push(new Tag(["p", pk], ev.Tags.length));
        }

        return await signEvent(ev);
      }
    },
    /**
     * Delete an event (NIP-09)
     */
    delete: async (id: u256) => {
      if (pubKey) {
        const ev = NEvent.ForPubKey(pubKey);
        ev.Kind = EventKind.Deletion;
        ev.Content = "";
        ev.Tags.push(new Tag(["e", id], 0));
        return await signEvent(ev);
      }
    },
    /**
     * Repost a note (NIP-18)
     */
    repost: async (note: NEvent) => {
      if (pubKey) {
        const ev = NEvent.ForPubKey(pubKey);
        ev.Kind = EventKind.Repost;
        ev.Content = JSON.stringify(note.Original);
        ev.Tags.push(new Tag(["e", note.Id], 0));
        ev.Tags.push(new Tag(["p", note.PubKey], 1));
        return await signEvent(ev);
      }
    },
    decryptDm: async (note: NEvent): Promise<string | undefined> => {
      if (pubKey) {
        if (note.PubKey !== pubKey && !note.Tags.some(a => a.PubKey === pubKey)) {
          return "<CANT DECRYPT>";
        }
        try {
          const otherPubKey =
            note.PubKey === pubKey ? unwrap(note.Tags.filter(a => a.Key === "p")[0].PubKey) : note.PubKey;
          if (hasNip07 && !privKey) {
            return await barrierNip07(() => window.nostr.nip04.decrypt(otherPubKey, note.Content));
          } else if (privKey) {
            await note.DecryptDm(privKey, otherPubKey);
            return note.Content;
          }
        } catch (e) {
          console.error("Decryption failed", e);
          return "<DECRYPTION FAILED>";
        }
      }
    },
    sendDm: async (content: string, to: HexKey) => {
      if (pubKey) {
        const ev = NEvent.ForPubKey(pubKey);
        ev.Kind = EventKind.DirectMessage;
        ev.Content = content;
        ev.Tags.push(new Tag(["p", to], 0));

        try {
          if (hasNip07 && !privKey) {
            const cx: string = await barrierNip07(() => window.nostr.nip04.encrypt(to, content));
            ev.Content = cx;
            return await signEvent(ev);
          } else if (privKey) {
            await ev.EncryptDmForPubkey(to, privKey);
            return await signEvent(ev);
          }
        } catch (e) {
          console.error("Encryption failed", e);
        }
      }
    },
  };
}

let isNip07Busy = false;

const delay = (t: number) => {
  return new Promise(resolve => {
    setTimeout(resolve, t);
  });
};

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
