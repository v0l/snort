import { debugLog, setLogging } from "./debug";
import {
  EventMetadata,
  NostrEvent,
  OkResponse,
  ReqCommand,
  WorkerMessage,
  WorkerMessageCommand,
  unixNowMs,
} from "./types";
import { v4 as uuid } from "uuid";

export interface InitAargs {
  /**
   * OPFS file path for the database
   */
  databasePath: string;

  /**
   * How many events to insert per batch
   */
  insertBatchSize?: number;
}

export class WorkerRelayInterface {
  #worker: Worker;
  #commandQueue: Map<string, (v: unknown, ports: ReadonlyArray<MessagePort>) => void> = new Map();

  // Command timeout
  timeout: number = 30_000;

  /**
   * Interface wrapper for worker relay
   * @param scriptPath Path to worker script or Worker script object
   */
  constructor(scriptPath?: string | URL | Worker) {
    if (scriptPath instanceof Worker) {
      this.#worker = scriptPath;
    } else {
      const sp = scriptPath ? scriptPath : new URL("@snort/worker-relay/dist/esm/worker.mjs", import.meta.url);
      this.#worker = new Worker(sp, { type: "module" });
    }
    this.#worker.onerror = e => {
      console.error(e.message, e);
    };
    this.#worker.onmessageerror = e => {
      console.error(e);
    };
    this.#worker.onmessage = e => {
      const cmd = e.data as WorkerMessage<any>;
      if (cmd.cmd === "reply") {
        const q = this.#commandQueue.get(cmd.id);
        q?.(cmd, e.ports);
        this.#commandQueue.delete(cmd.id);
      }
    };
  }

  async init(args: InitAargs) {
    return await this.#workerRpc<InitAargs, boolean>("init", args);
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

  async delete(req: ReqCommand) {
    return await this.#workerRpc<ReqCommand, Array<string>>("delete", req);
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

  async wipe() {
    return await this.#workerRpc<void, boolean>("wipe");
  }

  async forYouFeed(pubkey: string) {
    return await this.#workerRpc<string, Array<NostrEvent>>("forYouFeed", pubkey);
  }

  setEventMetadata(id: string, meta: EventMetadata) {
    return this.#workerRpc<[string, EventMetadata], void>("setEventMetadata", [id, meta]);
  }

  async debug(v: string) {
    setLogging(true);
    return await this.#workerRpc<string, boolean>("debug", v);
  }

  configureSearchIndex(config: Record<number, Array<string>>) {
    return this.#workerRpc<Record<number, Array<string>>, void>("configureSearchIndex", config);
  }

  async #workerRpc<T, R>(cmd: WorkerMessageCommand, args?: T) {
    const id = uuid();
    const msg = {
      id,
      cmd,
      args,
    } as WorkerMessage<T>;
    //const start = unixNowMs();
    return await new Promise<R>((resolve, reject) => {
      this.#worker.postMessage(msg);
      const t = setTimeout(() => {
        this.#commandQueue.delete(id);
        reject(
          new Error(`Timeout executing ${cmd} ${JSON.stringify(args)}`, {
            cause: msg,
          }),
        );
      }, this.timeout);
      this.#commandQueue.set(id, (v, port) => {
        clearTimeout(t);
        const cmdReply = v as WorkerMessage<R & { error?: any }>;
        if (cmdReply.args.error) {
          reject(cmdReply.args.error);
          return;
        }
        //debugLog("interface", `${cmd} took ${(unixNowMs() - start).toFixed(1)}ms`, args);
        resolve(cmdReply.args);
      });
    });
  }
}
