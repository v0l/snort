import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { Connection } from "../connection";
import { ReqFilter, TaggedNostrEvent } from "../nostr";
import { Negentropy } from "./negentropy";
import { NegentropyStorageVector } from "./vector-storage";
import debug from "debug";
import EventEmitter from "eventemitter3";

export interface NegentropyFlowEvents {
  /**
   * When sync is finished emit a set of filters which can resolve sync
   */
  finish: (req: Array<ReqFilter>) => void;
}

/**
 * Negentropy sync flow on connection
 */
export class NegentropyFlow extends EventEmitter<NegentropyFlowEvents> {
  readonly idSize: number = 16;
  #log = debug("NegentropyFlow");
  #id: string;
  #connection: Connection;
  #filters: Array<ReqFilter>;
  #negentropy: Negentropy;
  #need: Array<string> = [];

  constructor(id: string, conn: Connection, set: Array<TaggedNostrEvent>, filters: Array<ReqFilter>) {
    super();
    this.#id = id;
    this.#connection = conn;
    this.#filters = filters;

    this.#connection.on("unknownMessage", this.#handleMessage.bind(this));
    this.#connection.on("notice", n => this.#handleMessage.bind(this));

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
    this.#connection.send(["NEG-OPEN", this.#id, this.#filters, bytesToHex(init)]);
  }

  #handleMessage(msg: Array<any>) {
    try {
      switch (msg[0] as string) {
        case "NOTICE": {
          if ((msg[1] as string).includes("negentropy disabled")) {
            this.#log("SYNC ERROR: %s", msg[1]);
            this.#cleanup();
          }
          break;
        }
        case "NEG-ERROR": {
          if (msg[1] !== this.#id) break;
          this.#log("SYNC ERROR %s", msg[2]);
          this.#cleanup();
          break;
        }
        case "NEG-MSG": {
          if (msg[1] !== this.#id) break;
          const query = hexToBytes(msg[2] as string);
          const [nextMsg, _, need] = this.#negentropy.reconcile(query);
          if (need.length > 0) {
            this.#need.push(...need.map(bytesToHex));
          }
          if (nextMsg) {
            this.#connection.send(["NEG-MSG", this.#id, bytesToHex(nextMsg)]);
          } else {
            this.#connection.send(["NEG-CLOSE", this.#id]);
            this.#cleanup();
          }
          break;
        }
      }
    } catch (e) {
      debugger;
      console.error(e);
    }
  }

  #cleanup() {
    this.#connection.off("unknownMessage", this.#handleMessage.bind(this));
    this.#connection.off("notice", n => this.#handleMessage.bind(this));
    this.emit("finish", this.#need.length > 0 ? [{ ids: this.#need }] : []);
  }
}
