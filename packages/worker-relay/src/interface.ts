import { EventMetadata, NostrEvent, OkResponse, ReqCommand, WorkerMessage, WorkerMessageCommand } from "./types";
import { v4 as uuid } from "uuid";

export class WorkerRelayInterface {
  #worker: Worker;
  #sqliteDir?: string;
  #commandQueue: Map<string, (v: unknown, ports: ReadonlyArray<MessagePort>) => void> = new Map();

  // Command timeout
  timeout: number = 30_000;

  /**
   * Interface wrapper for worker relay
   * @param scriptPath Path to worker script or Worker script object
   * @param sqlite3Dir Directory to search for sqlite3 depends
   */
  constructor(scriptPath?: string | URL | Worker, sqlite3Dir?: string) {
    this.#sqliteDir = sqlite3Dir;
    if (scriptPath instanceof Worker) {
      this.#worker = scriptPath;
    } else {
      const sp = scriptPath ? scriptPath : new URL("@snort/worker-relay/dist/esm/worker.mjs", import.meta.url);
      this.#worker = new Worker(sp, { type: "module" })
    };
    this.#worker.onerror = e => {
      console.error(e.message, e);
    }
    this.#worker.onmessageerror = e => {
      console.error(e);
    }
    this.#worker.onmessage = e => {
      const cmd = e.data as WorkerMessage<any>;
      if (cmd.cmd === "reply") {
        const q = this.#commandQueue.get(cmd.id);
        q?.(cmd, e.ports);
        this.#commandQueue.delete(cmd.id);
      }
    };
  }

  async init(databasePath: string) {
    return await this.#workerRpc<Array<string>, boolean>("init", [databasePath, this.#sqliteDir ?? ""]);
  }

  async event(ev: NostrEvent) {
    return await this.#workerRpc<NostrEvent, OkResponse>("event", ev);
  }

  async query(req: ReqCommand) {
    return await this.#workerRpc<ReqCommand, Array<NostrEvent>>("req", req);
  }

  async count(req: ReqCommand) {
    return await this.#workerRpc<ReqCommand, number>("count", req);
  }

  async summary() {
    return await this.#workerRpc<void, Record<string, number>>("summary");
  }

  async close(id: string) {
    return await this.#workerRpc<string, boolean>("close", id);
  }

  async dump() {
    return await this.#workerRpc<void, Uint8Array>("dumpDb");
  }

  async forYouFeed(pubkey: string) {
    return await this.#workerRpc<string, Array<NostrEvent>>("forYouFeed", pubkey);
  }

  setEventMetadata(id: string, meta: EventMetadata) {
    return this.#workerRpc<[string, EventMetadata], void>("setEventMetadata", [id, meta]);
  }

  async debug(v: string) {
    return await this.#workerRpc<string, boolean>("debug", v);
  }

  async #workerRpc<T, R>(cmd: WorkerMessageCommand, args?: T) {
    const id = uuid();
    const msg = {
      id,
      cmd,
      args,
    } as WorkerMessage<T>;
    return await new Promise<R>((resolve, reject) => {
      this.#worker.postMessage(msg);
      const t = setTimeout(() => {
        this.#commandQueue.delete(id);
        reject(new Error("Timeout"));
      }, this.timeout);
      this.#commandQueue.set(id, (v, port) => {
        clearTimeout(t);
        const cmdReply = v as WorkerMessage<R & { error?: any }>;
        if (cmdReply.args.error) {
          reject(cmdReply.args.error);
          return;
        }
        resolve(cmdReply.args);
      });
    });
  }
}
