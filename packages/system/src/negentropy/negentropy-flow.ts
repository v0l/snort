import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import type { ConnectionType } from "../connection-pool";
import type { ReqFilter, TaggedNostrEvent } from "../nostr";
import { Negentropy } from "./negentropy";
import { NegentropyStorageVector } from "./vector-storage";
import debug from "debug";
import { EventEmitter } from "eventemitter3";

export interface NegentropyFlowEvents {
  /**
   * When sync is finished emit a set of filters which can resolve sync
   */
  finish: (req: Array<ReqFilter>) => void;

  /**
   * If an error is detected and Negentropy flow is not supported
   */
  error: () => void;
}

/**
 * Negentropy sync flow on connection
 */
export class NegentropyFlow extends EventEmitter<NegentropyFlowEvents> {
  readonly idSize: number = 16;
  #log = debug("NegentropyFlow");
  #id: string;
  #connection: ConnectionType;
  #filters: Array<ReqFilter>;
  #negentropy: Negentropy;
  #need: Array<string> = [];

  constructor(id: string, conn: ConnectionType, set: Array<TaggedNostrEvent>, filters: Array<ReqFilter>) {
    super();
    this.#id = id;
    this.#connection = conn;
    this.#filters = filters;

    this.#connection.on("unknownMessage", msg => this.#handleMessage(msg));
    this.#connection.on("notice", n => this.#handleMessage(["NOTICE", n]));

    const storage = new NegentropyStorageVector();
    set.forEach(a => storage.insert(a.created_at, a.id));
    storage.seal();
    this.#negentropy = new Negentropy(storage, 50_000);
  }

  /**
   * Start sync
   */
  start() {
    const init = this.#negentropy.initiate();
    this.#connection.sendRaw(["NEG-OPEN", this.#id, this.#filters, bytesToHex(init)]);
  }

  #handleMessage(msg: Array<any>) {
    try {
      switch (msg[0] as string) {
        case "NOTICE": {
          const [_, errorMsg] = msg as [string, string];
          if (errorMsg.includes("negentropy disabled") || errorMsg.includes("negentropy error")) {
            this.#log("SYNC ERROR: %s", errorMsg);
            this.#cleanup(true);
          }
          break;
        }
        case "NEG-ERROR": {
          const [_, id, errorMsg] = msg as [string, string, string];
          if (id !== this.#id) break;
          this.#log("SYNC ERROR %s", errorMsg);
          this.#cleanup(true);
          break;
        }
        case "NEG-MSG": {
          const [, id, payload] = msg as [string, string, string];
          if (id !== this.#id) break;
          const query = hexToBytes(payload);
          const [nextMsg, , need] = this.#negentropy.reconcile(query);
          if (need.length > 0) {
            this.#need.push(...need.map(bytesToHex));
          }
          if (nextMsg) {
            this.#connection.sendRaw(["NEG-MSG", this.#id, bytesToHex(nextMsg)]);
          } else {
            this.#connection.sendRaw(["NEG-CLOSE", this.#id]);
            this.#cleanup();
          }
          break;
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  #cleanup(error = false) {
    this.#connection.off("unknownMessage", msg => this.#handleMessage(msg));
    this.#connection.off("notice", n => this.#handleMessage(["NOTICE", n]));
    this.emit("finish", this.#need.length > 0 ? [{ ids: this.#need }] : []);
    if (error) {
      this.emit("error");
    }
  }
}
