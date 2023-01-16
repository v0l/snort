import * as secp from '@noble/secp256k1';
import * as base64 from "@protobufjs/base64"
import { HexKey, RawEvent, TaggedRawEvent } from '.';
import EventKind from "./EventKind";
import Tag from './Tag';
import Thread from './Thread';

export default class Event {
    /**
     * The original event
     */
    Original: TaggedRawEvent | null;

    /**
     * Id of the event
     */
    Id: string

    /**
     * Pub key of the creator
     */
    PubKey: string;

    /**
     * Timestamp when the event was created
     */
    CreatedAt: number;

    /**
     * The type of event
     */
    Kind: EventKind;

    /**
     * A list of metadata tags
     */
    Tags: Array<Tag>;

    /**
     * Content of the event
     */
    Content: string;

    /**
     * Signature of this event from the creator
     */
    Signature: string;

    /**
     * Thread information for this event
     */
    Thread: Thread | null;

    constructor(e?: TaggedRawEvent) {
        this.Original = e ?? null;
        this.Id = e?.id ?? "";
        this.PubKey = e?.pubkey ?? "";
        this.CreatedAt = e?.created_at ?? Math.floor(new Date().getTime() / 1000);
        this.Kind = e?.kind ?? EventKind.Unknown;
        this.Tags = e?.tags.map((a, i) => new Tag(a, i)) ?? [];
        this.Content = e?.content ?? "";
        this.Signature = e?.sig ?? "";
        this.Thread = Thread.ExtractThread(this);
    }

    /**
     * Get the pub key of the creator of this event NIP-26
     */
    get RootPubKey() {
        let delegation = this.Tags.find(a => a.Key === "delegation");
        if (delegation?.PubKey) {
            return delegation.PubKey;
        }
        return this.PubKey;
    }

    /**
     * Sign this message with a private key
     */
    async Sign(key: HexKey) {
        this.Id = await this.CreateId();

        let sig = await secp.schnorr.sign(this.Id, key);
        this.Signature = secp.utils.bytesToHex(sig);
        if (!await this.Verify()) {
            throw "Signing failed";
        }
    }

    /**
     * Check the signature of this message
     * @returns True if valid signature
     */
    async Verify() {
        let id = await this.CreateId();
        let result = await secp.schnorr.verify(this.Signature, id, this.PubKey);
        return result;
    }

    async CreateId() {
        let payload = [
            0,
            this.PubKey,
            this.CreatedAt,
            this.Kind,
            this.Tags.map(a => a.ToObject()).filter(a => a !== null),
            this.Content
        ];

        let payloadData = new TextEncoder().encode(JSON.stringify(payload));
        let data = await secp.utils.sha256(payloadData);
        let hash = secp.utils.bytesToHex(data);
        if (this.Id !== "" && hash !== this.Id) {
            console.debug(payload);
            throw "ID doesnt match!";
        }
        return hash;
    }

    ToObject(): RawEvent {
        return {
            id: this.Id,
            pubkey: this.PubKey,
            created_at: this.CreatedAt,
            kind: this.Kind,
            tags: <string[][]>this.Tags.sort((a, b) => a.Index - b.Index).map(a => a.ToObject()).filter(a => a !== null),
            content: this.Content,
            sig: this.Signature
        };
    }

    /**
     * Create a new event for a specific pubkey
     */
    static ForPubKey(pubKey: HexKey) {
        let ev = new Event();
        ev.PubKey = pubKey;
        return ev;
    }

    /**
     * Encrypt the message content in place
     */
    async EncryptDmForPubkey(pubkey: HexKey, privkey: HexKey) {
        let key = await this._GetDmSharedKey(pubkey, privkey);
        let iv = window.crypto.getRandomValues(new Uint8Array(16));
        let data = new TextEncoder().encode(this.Content);
        let result = await window.crypto.subtle.encrypt({
            name: "AES-CBC",
            iv: iv
        }, key, data);
        let uData = new Uint8Array(result);
        this.Content = `${base64.encode(uData, 0, result.byteLength)}?iv=${base64.encode(iv, 0, 16)}`;
    }

    /**
     * Decrypt the content of this message in place
     */
    async DecryptDm(privkey: HexKey, pubkey: HexKey) {
        let key = await this._GetDmSharedKey(pubkey, privkey);
        let cSplit = this.Content.split("?iv=");
        let data = new Uint8Array(base64.length(cSplit[0]));
        base64.decode(cSplit[0], data, 0);

        let iv = new Uint8Array(base64.length(cSplit[1]));
        base64.decode(cSplit[1], iv, 0);

        let result = await window.crypto.subtle.decrypt({
            name: "AES-CBC",
            iv: iv
        }, key, data);
        this.Content = new TextDecoder().decode(result);
    }

    async _GetDmSharedKey(pubkey: HexKey, privkey: HexKey) {
        let sharedPoint = secp.getSharedSecret(privkey, '02' + pubkey);
        let sharedX = sharedPoint.slice(1, 33);
        return await window.crypto.subtle.importKey("raw", sharedX, { name: "AES-CBC" }, false, ["encrypt", "decrypt"])
    }
}