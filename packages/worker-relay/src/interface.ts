import debug from "debug";
import { NostrEvent, ReqCommand, WorkerMessage } from "./types";
import { v4 as uuid } from "uuid";

export class WorkerRelayInterface {
  #worker: Worker;
  #log = (msg: any) => console.debug(msg);
  #commandQueue: Map<string, (v: unknown, ports: ReadonlyArray<MessagePort>) => void> = new Map();

  constructor(path: string) {
    this.#log(`Module path: ${path}`);
    this.#worker = new Worker(path, { type: "module" });
    this.#worker.onmessage = e => {
      const cmd = e.data as WorkerMessage<any>;
      if (cmd.cmd === "reply") {
        const q = this.#commandQueue.get(cmd.id);
        q?.(cmd, e.ports);
        this.#commandQueue.delete(cmd.id);
      }
    };
  }

  async init() {
    return (await this.#workerRpc<void, boolean>("init")).result;
  }

  async open() {
    return (await this.#workerRpc<void, boolean>("open")).result;
  }

  async migrate() {
    return (await this.#workerRpc<void, boolean>("migrate")).result;
  }

  async event(ev: NostrEvent) {
    return (await this.#workerRpc<NostrEvent, boolean>("event", ev)).result;
  }

  async req(req: ReqCommand) {
    return await this.#workerRpc<ReqCommand, Array<NostrEvent>>("req", req);
  }

  async count(req: ReqCommand) {
    return (await this.#workerRpc<ReqCommand, number>("count", req)).result;
  }

  async summary() {
    return (await this.#workerRpc<void, Record<string, number>>("summary")).result;
  }

  async close(id: string) {
    return (await this.#workerRpc<string, boolean>("close", id)).result;
  }

  async dump() {
    return (await this.#workerRpc<void, Uint8Array>("dumpDb")).result;
  }

  async sql(sql: string, params: Array<string | number>) {
    return (await this.#workerRpc<object, Array<Array<any>>>("sql", { sql, params })).result;
  }

  #workerRpc<T, R>(cmd: string, args?: T) {
    const id = uuid();
    const msg = {
      id,
      cmd,
      args,
    } as WorkerMessage<T>;
    this.#worker.postMessage(msg);
    return new Promise<{
      result: R;
      port: MessagePort | undefined;
    }>(resolve => {
      this.#commandQueue.set(id, (v, port) => {
        const cmdReply = v as WorkerMessage<R>;
        resolve({
          result: cmdReply.args,
          port: port.length > 0 ? port[0] : undefined,
        });
      });
    });
  }
}
