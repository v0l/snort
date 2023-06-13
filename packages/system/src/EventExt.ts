import * as secp from "@noble/curves/secp256k1";
import * as utils from "@noble/curves/abstract/utils";
import { EventKind, HexKey, NostrEvent } from ".";
import base64 from "@protobufjs/base64";
import { sha256, unixNow } from "./Utils";

export interface Tag {
  key: string
  value?: string
  relay?: string
  marker?: string // NIP-10
}

export interface Thread {
  root?: Tag
  replyTo?: Tag
  mentions: Array<Tag>
  pubKeys: Array<HexKey>
}

export abstract class EventExt {
  /**
   * Get the pub key of the creator of this event NIP-26
   */
  static getRootPubKey(e: NostrEvent): HexKey {
    const delegation = e.tags.find(a => a[0] === "delegation");
    if (delegation?.[1]) {
      // todo: verify sig
      return delegation[1];
    }
    return e.pubkey;
  }

  /**
   * Sign this message with a private key
   */
  static sign(e: NostrEvent, key: HexKey) {
    e.id = this.createId(e);

    const sig = secp.schnorr.sign(e.id, key);
    e.sig = utils.bytesToHex(sig);
    if (!(secp.schnorr.verify(e.sig, e.id, e.pubkey))) {
      throw new Error("Signing failed");
    }
  }

  /**
   * Check the signature of this message
   * @returns True if valid signature
   */
  static verify(e: NostrEvent) {
    const id = this.createId(e);
    const result = secp.schnorr.verify(e.sig, id, e.pubkey);
    return result;
  }

  static createId(e: NostrEvent) {
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
    } as NostrEvent;
  }

  static parseTag(tag: Array<string>) {
    if (tag.length < 1) {
      throw new Error("Invalid tag, must have more than 2 items")
    }

    const ret = {
      key: tag[0],
      value: tag[1]
    } as Tag;
    switch (ret.key) {
      case "e": {
        ret.relay = tag.length > 2 ? tag[2] : undefined;
        ret.marker = tag.length > 3 ? tag[3] : undefined;
        break;
      }
    }
    return ret;
  }
  static extractThread(ev: NostrEvent) {
    const isThread = ev.tags.some(a => (a[0] === "e" && a[3] !== "mention") || a[0] == "a");
    if (!isThread) {
      return undefined;
    }

    const shouldWriteMarkers = ev.kind === EventKind.TextNote;
    const ret = {
      mentions: [],
      pubKeys: [],
    } as Thread;
    const eTags = ev.tags.filter(a => a[0] === "e" || a[0] === "a").map(a => EventExt.parseTag(a));
    const marked = eTags.some(a => a.marker);
    if (!marked) {
      ret.root = eTags[0];
      ret.root.marker = shouldWriteMarkers ? "root" : undefined;
      if (eTags.length > 1) {
        ret.replyTo = eTags[eTags.length - 1];
        ret.replyTo.marker = shouldWriteMarkers ? "reply" : undefined;
      }
      if (eTags.length > 2) {
        ret.mentions = eTags.slice(1, -1);
        if (shouldWriteMarkers) {
          ret.mentions.forEach(a => (a.marker = "mention"));
        }
      }
    } else {
      const root = eTags.find(a => a.marker === "root");
      const reply = eTags.find(a => a.marker === "reply");
      ret.root = root;
      ret.replyTo = reply;
      ret.mentions = eTags.filter(a => a.marker === "mention");
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
    const sharedPoint = secp.secp256k1.getSharedSecret(privkey, "02" + pubkey);
    const sharedX = sharedPoint.slice(1, 33);
    return await window.crypto.subtle.importKey("raw", sharedX, { name: "AES-CBC" }, false, ["encrypt", "decrypt"]);
  }
}