import { unwrap, bech32ToHex } from "@snort/shared";
import { secp256k1 } from "@noble/curves/secp256k1";
import { v4 as uuid } from "uuid";
import debug from "debug";

import { Connection } from "../connection";
import { EventSigner, PrivateKeySigner } from "../event-publisher";
import { NostrEvent } from "../nostr";
import { EventBuilder } from "../event-builder";
import EventKind from "../event-kind";

const NIP46_KIND = 24_133;

interface Nip46Metadata {
    name: string
    url?: string
    description?: string
    icons?: Array<string>
}

interface Nip46Request {
    id: string
    method: string
    params: Array<any>
}

interface Nip46Response {
    id: string
    result: any
    error?: string
}

interface QueueObj {
    resolve: (o: Nip46Response) => void;
    reject: (e: Error) => void;
}

export class Nip46Signer implements EventSigner {
    #conn?: Connection;
    #relay: string;
    #target: string;
    #token?: string;
    #insideSigner: EventSigner;
    #commandQueue: Map<string, QueueObj> = new Map();
    #log = debug("NIP-46");

    constructor(config: string, insideSigner?: EventSigner) {
        const u = new URL(config);
        this.#target = u.pathname.substring(2);

        if (u.hash.length > 1) {
            this.#token = u.hash.substring(1);
        }
        if (this.#target.startsWith("npub")) {
            this.#target = bech32ToHex(this.#target);
        }

        this.#relay = unwrap(u.searchParams.get("relay"));
        this.#insideSigner = insideSigner ?? new PrivateKeySigner(secp256k1.utils.randomPrivateKey())
    }

    async init() {
        return await new Promise<void>((resolve, reject) => {
            this.#conn = new Connection(this.#relay, { read: true, write: true });
            this.#conn.OnEvent = async (sub, e) => {
                await this.#onReply(e);
            }
            this.#conn.OnConnected = async () => {
                const insidePubkey = await this.#insideSigner.getPubKey();
                this.#conn!.QueueReq(["REQ", "reply", {
                    kinds: [NIP46_KIND],
                    authors: [this.#target],
                    "#p": [insidePubkey]
                }], () => { });

                const rsp = await this.#connect(insidePubkey);
                if (rsp === "ack") {
                    resolve();
                } else {
                    reject();
                }
            }
            this.#conn.Connect();
        })

    }

    async getPubKey() {
        return await this.#rpc<string>("get_public_key", []);
    }

    async nip4Encrypt(content: string, otherKey: string) {
        return await this.#rpc<string>("nip04_encrypt", [otherKey, content]);
    }

    async nip4Decrypt(content: string, otherKey: string) {
        return await this.#rpc<string>("nip04_decrypt", [otherKey, content]);
    }

    async sign(ev: NostrEvent) {
        return await this.#rpc<NostrEvent>("nip04_decrypt", [ev]);
    }

    async #connect(pk: string) {
        const connectParams = [pk];
        if (this.#token) {
            connectParams.push(this.#token);
        }
        return await this.#rpc<string>("connect", connectParams);
    }

    async #onReply(e: NostrEvent) {
        if (e.kind !== NIP46_KIND) {
            throw new Error("Unknown event kind");
        }

        const decryptedContent = await this.#insideSigner.nip4Decrypt(e.content, this.#target);
        const reply = JSON.parse(decryptedContent) as Nip46Response;

        const pending = this.#commandQueue.get(reply.id);
        if (!pending) {
            throw new Error("No pending command found");
        }

        pending.resolve(reply);
        this.#commandQueue.delete(reply.id);
    }

    async #rpc<T>(method: string, params: Array<any>) {
        if (!this.#conn) throw new Error("Connection error");

        const id = uuid();
        const payload = {
            id,
            method,
            params,
        } as Nip46Request;
        this.#log("Request: %O", payload);

        const eb = new EventBuilder();
        eb.kind(NIP46_KIND as EventKind)
            .content(await this.#insideSigner.nip4Encrypt(JSON.stringify(payload), this.#target))
            .tag(["p", this.#target]);

        const evCommand = await eb.buildAndSign(this.#insideSigner);
        await this.#conn.SendAsync(evCommand);

        return await new Promise<T>((resolve, reject) => {
            this.#commandQueue.set(id, {
                resolve: async (o: Nip46Response) => {
                    this.#log("Reply: %O", o);
                    resolve(o.result as T);
                },
                reject,
            });
        });
    }
}
