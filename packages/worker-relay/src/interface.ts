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
    return await this.#workerRpc<void, boolean>("init");
  }

  async open() {
    return await this.#workerRpc<void, boolean>("open");
  }

  async migrate() {
    return await this.#workerRpc<void, boolean>("migrate");
  }

  async event(ev: NostrEvent) {
    return await this.#workerRpc<NostrEvent, boolean>("event", ev);
  }

  async req(req: ReqCommand) {
    return await this.#workerRpc<ReqCommand, { results: Array<NostrEvent>; port?: Readonly<MessagePort> }>("req", req);
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

  #workerRpc<T, R>(cmd: string, args?: T, timeout = 30_000) {
    const id = uuid();
    const msg = {
      id,
      cmd,
      args,
    } as WorkerMessage<T>;
    this.#worker.postMessage(msg);
    return new Promise<R>((resolve, reject) => {
      let t: ReturnType<typeof setTimeout>;
      this.#commandQueue.set(id, (v, ports) => {
        clearTimeout(t);
        const cmdReply = v as WorkerMessage<R>;
        resolve({ ...cmdReply.args, port: ports.length > 0 ? ports[0] : undefined });
      });
      t = setTimeout(() => {
        reject("timeout");
        this.#commandQueue.delete(id);
      }, timeout);
    });
  }
}
