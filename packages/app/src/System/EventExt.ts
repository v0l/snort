import * as secp from "@noble/secp256k1";
import { EventKind, HexKey, RawEvent, Tag } from "@snort/nostr";
import base64 from "@protobufjs/base64";
import { sha256, unixNow } from "Util";

export interface Thread {
  root?: Tag;
  replyTo?: Tag;
  mentions: Array<Tag>;
  pubKeys: Array<HexKey>;
}

export abstract class EventExt {
  /**
   * Get the pub key of the creator of this event NIP-26
   */
  static getRootPubKey(e: RawEvent): HexKey {
    const delegation = e.tags.find(a => a[0] === "delegation");
    if (delegation?.[1]) {
      return delegation[1];
    }
    return e.pubkey;
  }

  /**
   * Sign this message with a private key
   */
  static async sign(e: RawEvent, key: HexKey) {
    e.id = this.createId(e);

    const sig = await secp.schnorr.sign(e.id, key);
    e.sig = secp.utils.bytesToHex(sig);
    if (!(await secp.schnorr.verify(e.sig, e.id, e.pubkey))) {
      throw new Error("Signing failed");
    }
  }

  /**
   * Check the signature of this message
   * @returns True if valid signature
   */
  static async verify(e: RawEvent) {
    const id = this.createId(e);
    const result = await secp.schnorr.verify(e.sig, id, e.pubkey);
    return result;
  }

  static createId(e: RawEvent) {
    const payload = [0, e.pubkey, e.created_at, e.kind, e.tags, e.content];

    const hash = sha256(JSON.stringify(payload));
    if (e.id !== "" && hash !== e.id) {
      console.debug(payload);
      throw new Error("ID doesnt match!");
    }
    return hash;
  }

  /**
   * Create a new event for a specific pubkey
   */
  static forPubKey(pk: HexKey, kind: EventKind) {
    return {
      pubkey: pk,
      kind: kind,
      created_at: unixNow(),
      content: "",
      tags: [],
      id: "",
      sig: "",
    } as RawEvent;
  }

  static extractThread(ev: RawEvent) {
    const isThread = ev.tags.some(a => (a[0] === "e" && a[3] !== "mention") || a[0] == "a");
    if (!isThread) {
      return undefined;
    }

    const shouldWriteMarkers = ev.kind === EventKind.TextNote;
    const ret = {
      mentions: [],
      pubKeys: [],
    } as Thread;
    const eTags = ev.tags.filter(a => a[0] === "e" || a[0] === "a").map((v, i) => new Tag(v, i));
    const marked = eTags.some(a => a.Marker !== undefined);
    if (!marked) {
      ret.root = eTags[0];
      ret.root.Marker = shouldWriteMarkers ? "root" : undefined;
      if (eTags.length > 1) {
        ret.replyTo = eTags[1];
        ret.replyTo.Marker = shouldWriteMarkers ? "reply" : undefined;
      }
      if (eTags.length > 2) {
        ret.mentions = eTags.slice(2);
        if (shouldWriteMarkers) {
          ret.mentions.forEach(a => (a.Marker = "mention"));
        }
      }
    } else {
      const root = eTags.find(a => a.Marker === "root");
      const reply = eTags.find(a => a.Marker === "reply");
      ret.root = root;
      ret.replyTo = reply;
      ret.mentions = eTags.filter(a => a.Marker === "mention");
    }
    ret.pubKeys = Array.from(new Set(ev.tags.filter(a => a[0] === "p").map(a => a[1])));
    return ret;
  }

  /**
   * Encrypt the given message content
   */
  static async encryptData(content: string, pubkey: HexKey, privkey: HexKey) {
    const key = await this.#getDmSharedKey(pubkey, privkey);
    const iv = window.crypto.getRandomValues(new Uint8Array(16));
    const data = new TextEncoder().encode(content);
    const result = await window.crypto.subtle.encrypt(
      {
        name: "AES-CBC",
        iv: iv,
      },
      key,
      data
    );
    const uData = new Uint8Array(result);
    return `${base64.encode(uData, 0, result.byteLength)}?iv=${base64.encode(iv, 0, 16)}`;
  }

  /**
   * Decrypt the content of the message
   */
  static async decryptData(cyphertext: string, privkey: HexKey, pubkey: HexKey) {
    const key = await this.#getDmSharedKey(pubkey, privkey);
    const cSplit = cyphertext.split("?iv=");
    const data = new Uint8Array(base64.length(cSplit[0]));
    base64.decode(cSplit[0], data, 0);

    const iv = new Uint8Array(base64.length(cSplit[1]));
    base64.decode(cSplit[1], iv, 0);

    const result = await window.crypto.subtle.decrypt(
      {
        name: "AES-CBC",
        iv: iv,
      },
      key,
      data
    );
    return new TextDecoder().decode(result);
  }

  /**
   * Decrypt the content of this message in place
   */
  static async decryptDm(content: string, privkey: HexKey, pubkey: HexKey) {
    return await this.decryptData(content, privkey, pubkey);
  }

  static async #getDmSharedKey(pubkey: HexKey, privkey: HexKey) {
    const sharedPoint = secp.getSharedSecret(privkey, "02" + pubkey);
    const sharedX = sharedPoint.slice(1, 33);
    return await window.crypto.subtle.importKey("raw", sharedX, { name: "AES-CBC" }, false, ["encrypt", "decrypt"]);
  }
}
