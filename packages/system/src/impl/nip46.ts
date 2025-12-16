import { unwrap, bech32ToHex } from "@snort/shared";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { v4 as uuid } from "uuid";
import debug from "debug";

import { Connection } from "../connection";
import { type EventSigner, PrivateKeySigner } from "../signer";
import type { NostrEvent } from "../nostr";
import { EventBuilder } from "../event-builder";
import type EventKind from "../event-kind";
import { EventEmitter } from "eventemitter3";

const NIP46_KIND = 24_133;
// FIXME add all kinds that Snort signs
const PERMS =
  "nip04_encrypt,nip04_decrypt,sign_event:0,sign_event:1,sign_event:3,sign_event:4,sign_event:6,sign_event:7,sign_event:30078";

interface Nip46Metadata {
  name: string;
  url?: string;
  description?: string;
  icons?: Array<string>;
}

interface Nip46Request {
  id: string;
  method: string;
  params: Array<any>;
}

interface Nip46Response {
  id: string;
  result: any;
  error: string;
}

interface QueueObj {
  resolve: (o: Nip46Response) => void;
  reject: (e: Error) => void;
  authed?: boolean;
}

interface Nip46Events {
  oauth: (url: string) => void;
}

export class Nip46Signer extends EventEmitter<Nip46Events> implements EventSigner {
  #conn?: Connection;
  #relay: string;
  #localPubkey: string;
  #remotePubkey?: string;
  #token?: string;
  #insideSigner: EventSigner;
  #commandQueue: Map<string, QueueObj> = new Map();
  #log = debug("NIP-46");
  #proto: string;
  #didInit: boolean = false;

  /**
   * Start NIP-46 connection
   * @param config bunker/nostrconnect://{npub/hex-pubkey}?relay={websocket-url}#{token-hex}
   * @param insideSigner
   */
  constructor(config: string, insideSigner?: EventSigner) {
    super();
    const u = new URL(config);
    this.#proto = u.protocol;
    this.#localPubkey = u.hostname || u.pathname.substring(2);

    if (u.hash.length > 1) {
      this.#token = u.hash.substring(1);
    } else {
      this.#token = u.searchParams.get("secret") || undefined;
    }
    if (this.#localPubkey.startsWith("npub")) {
      this.#localPubkey = bech32ToHex(this.#localPubkey);
    }

    this.#relay = unwrap(u.searchParams.get("relay"));
    this.#insideSigner = insideSigner ?? new PrivateKeySigner(secp256k1.keygen().secretKey);

    if (this.isBunker) {
      this.#remotePubkey = this.#localPubkey;
    }
  }

  get supports(): string[] {
    return ["nip44"];
  }

  get relays() {
    return [this.#relay];
  }

  get privateKey() {
    if (this.#insideSigner instanceof PrivateKeySigner) {
      return this.#insideSigner.privateKey;
    }
  }

  get isBunker() {
    return this.#proto === "bunker:";
  }

  /**
   * Connect to the bunker relay
   * @param autoConnect Start connect flow for pubkey
   * @returns
   */
  async init(autoConnect = true) {
    this.#localPubkey = await this.#insideSigner.getPubKey();
    return await new Promise<void>((resolve, reject) => {
      this.#conn = new Connection(this.#relay, { read: true, write: true });
      this.#conn.on("unverifiedEvent", async (_sub, e) => {
        await this.#onReply(e);
      });
      this.#conn.on("connected", async () => {
        this.#conn!.request([
          "REQ",
          "reply",
          {
            kinds: [NIP46_KIND],
            "#p": [this.#localPubkey],
            // strfry doesn't always delete ephemeral events
            since: Math.floor(Date.now() / 1000 - 10),
          },
        ]);

        if (autoConnect) {
          if (this.isBunker) {
            const rsp = await this.#connect(unwrap(this.#remotePubkey));
            if (rsp.result === "ack") {
              resolve();
            } else {
              reject(rsp.error);
            }
          } else {
            this.#commandQueue.set("connect", {
              reject,
              resolve: () => {
                resolve();
              },
            });
          }
        } else {
          resolve();
        }
      });
      this.#conn.connect();
      this.#didInit = true;
    });
  }

  async close() {
    if (this.#conn) {
      await this.#disconnect();
      this.#conn.closeRequest("reply");
      this.#conn.close();
      this.#conn = undefined;
      this.#didInit = false;
    }
  }

  async describe() {
    const rsp = await this.#rpc("describe", []);
    return rsp.result as Array<string>;
  }

  async getPubKey() {
    //const rsp = await this.#rpc("get_public_key", []);
    //return rsp.result as string;
    return this.#remotePubkey!;
  }

  async nip4Encrypt(content: string, otherKey: string) {
    const rsp = await this.#rpc("nip04_encrypt", [otherKey, content]);
    return rsp.result as string;
  }

  async nip4Decrypt(content: string, otherKey: string) {
    const rsp = await this.#rpc("nip04_decrypt", [otherKey, content]);
    return rsp.result as string;
  }

  nip44Encrypt(content: string, key: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  nip44Decrypt(content: string, otherKey: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async sign(ev: NostrEvent) {
    const rsp = await this.#rpc("sign_event", [JSON.stringify(ev)]);
    const signed = JSON.parse(rsp.result as string) as NostrEvent;
    if (signed.id !== ev.id) {
      throw new Error(
        "Signer returned different event id! Please check your event format or contact the signer developer!",
      );
    }
    return {
      ...ev,
      sig: signed.sig,
    };
  }

  /**
   * NIP-46 oAuth bunker signup
   * @param name Desired name
   * @param domain Desired domain
   * @param email Backup email address
   * @returns
   */
  async createAccount(name: string, domain: string, email?: string) {
    await this.init(false);
    const rsp = await this.#rpc("create_account", [name, domain, email ?? "", PERMS]);
    if (!rsp.error) {
      this.#remotePubkey = rsp.result as string;
    }
  }

  async #disconnect() {
    return await this.#rpc("disconnect", []);
  }

  async #connect(pk: string) {
    const connectParams = [pk, this.#token ?? "", PERMS];
    return await this.#rpc("connect", connectParams);
  }

  async #onReply(e: NostrEvent) {
    if (e.kind !== NIP46_KIND) {
      throw new Error("Unknown event kind");
    }

    const decryptedContent = await this.#insideSigner.nip44Decrypt(e.content, e.pubkey);
    const reply = JSON.parse(decryptedContent) as Nip46Request | Nip46Response;

    let id = reply.id;
    this.#log("Recv: %O", reply);
    if ("method" in reply && reply.method === "connect") {
      this.#remotePubkey = reply.params[0];
      await this.#sendCommand(
        {
          id: reply.id,
          result: "ack",
          error: "",
        },
        unwrap(this.#remotePubkey),
      );
      id = "connect";
    }
    const pending = this.#commandQueue.get(id);
    if (!pending) {
      throw new Error("No pending command found");
    }

    if ("result" in reply && reply.result === "auth_url") {
      if (!pending.authed) this.emit("oauth", reply.error);
      pending.authed = true;
    } else {
      const rx = reply as Nip46Response;
      if (rx.error) {
        pending.reject(new Error(rx.error));
      } else {
        pending.resolve(rx);
      }
      this.#commandQueue.delete(reply.id);
    }
  }

  async #rpc(method: string, params: Array<any>) {
    if (!this.#didInit) {
      await this.init();
    }
    if (!this.#conn) throw new Error("Connection error");

    const payload = {
      id: uuid(),
      method,
      params,
    } as Nip46Request;

    this.#sendCommand(payload, unwrap(this.#remotePubkey));
    return await new Promise<Nip46Response>((resolve, reject) => {
      this.#commandQueue.set(payload.id, {
        resolve: async (o: Nip46Response) => {
          resolve(o);
        },
        reject,
      });
    });
  }

  async #sendCommand(payload: Nip46Request | Nip46Response, target: string) {
    if (!this.#conn) return;

    const eb = new EventBuilder();
    eb.kind(NIP46_KIND as EventKind)
      .content(await this.#insideSigner.nip44Encrypt(JSON.stringify(payload), target))
      .tag(["p", target]);

    this.#log("Send: %O", payload);
    const evCommand = await eb.buildAndSign(this.#insideSigner);
    await this.#conn.publish(evCommand);
  }
}
