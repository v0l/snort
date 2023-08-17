import { unwrap, bech32ToHex } from "@snort/shared";
import { secp256k1 } from "@noble/curves/secp256k1";
import { v4 as uuid } from "uuid";
import debug from "debug";

import { Connection } from "../connection";
import { EventSigner, PrivateKeySigner } from "../signer";
import { NostrEvent } from "../nostr";
import { EventBuilder } from "../event-builder";
import EventKind from "../event-kind";

const NIP46_KIND = 24_133;

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
  resolve: (o: any) => void;
  reject: (e: Error) => void;
}

export class Nip46Signer implements EventSigner {
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

  constructor(config: string, insideSigner?: EventSigner) {
    const u = new URL(config);
    this.#proto = u.protocol;
    this.#localPubkey = u.pathname.substring(2);

    if (u.hash.length > 1) {
      this.#token = u.hash.substring(1);
    }
    if (this.#localPubkey.startsWith("npub")) {
      this.#localPubkey = bech32ToHex(this.#localPubkey);
    }

    this.#relay = unwrap(u.searchParams.get("relay"));
    this.#insideSigner = insideSigner ?? new PrivateKeySigner(secp256k1.utils.randomPrivateKey());
  }

  get relays() {
    return [this.#relay];
  }

  get privateKey() {
    if (this.#insideSigner instanceof PrivateKeySigner) {
      return this.#insideSigner.privateKey;
    }
  }

  async init() {
    const isBunker = this.#proto === "bunker:";
    if (isBunker) {
      this.#remotePubkey = this.#localPubkey;
      this.#localPubkey = await this.#insideSigner.getPubKey();
    }
    return await new Promise<void>((resolve, reject) => {
      this.#conn = new Connection(this.#relay, { read: true, write: true });
      this.#conn.OnEvent = async (sub, e) => {
        await this.#onReply(e);
      };
      this.#conn.OnConnected = async () => {
        this.#conn!.QueueReq(
          [
            "REQ",
            "reply",
            {
              kinds: [NIP46_KIND],
              "#p": [this.#localPubkey],
            },
          ],
          () => {}
        );

        if (isBunker) {
          await this.#connect(unwrap(this.#remotePubkey));
          resolve();
        } else {
          this.#commandQueue.set("connect", {
            reject,
            resolve,
          });
        }
      };
      this.#conn.Connect();
      this.#didInit = true;
    });
  }

  async close() {
    if (this.#conn) {
      await this.#disconnect();
      this.#conn.CloseReq("reply");
      this.#conn.Close();
      this.#conn = undefined;
      this.#didInit = false;
    }
  }

  async describe() {
    return await this.#rpc<Array<string>>("describe", []);
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

  nip44Encrypt(content: string, key: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  nip44Decrypt(content: string, otherKey: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async sign(ev: NostrEvent) {
    const evStr = await this.#rpc<string>("sign_event", [JSON.stringify(ev)]);
    return JSON.parse(evStr);
  }

  async #disconnect() {
    return await this.#rpc("disconnect", []);
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

    const decryptedContent = await this.#insideSigner.nip4Decrypt(e.content, e.pubkey);
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
        unwrap(this.#remotePubkey)
      );
      id = "connect";
    }
    const pending = this.#commandQueue.get(id);
    if (!pending) {
      throw new Error("No pending command found");
    }

    pending.resolve(reply);
    this.#commandQueue.delete(reply.id);
  }

  async #rpc<T>(method: string, params: Array<any>) {
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
    return await new Promise<T>((resolve, reject) => {
      this.#commandQueue.set(payload.id, {
        resolve: async (o: Nip46Response) => {
          resolve(o.result as T);
        },
        reject,
      });
    });
  }

  async #sendCommand(payload: Nip46Request | Nip46Response, target: string) {
    if (!this.#conn) return;

    const eb = new EventBuilder();
    eb.kind(NIP46_KIND as EventKind)
      .content(await this.#insideSigner.nip4Encrypt(JSON.stringify(payload), target))
      .tag(["p", target]);

    this.#log("Send: %O", payload);
    const evCommand = await eb.buildAndSign(this.#insideSigner);
    await this.#conn.SendAsync(evCommand);
  }
}
