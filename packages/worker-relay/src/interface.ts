import { NostrEvent, OkResponse, ReqCommand, ReqFilter, WorkerMessage, WorkerMessageCommand } from "./types";
import { v4 as uuid } from "uuid";

export class WorkerRelayInterface {
  #worker: Worker;
  #commandQueue: Map<string, (v: unknown, ports: ReadonlyArray<MessagePort>) => void> = new Map();

  constructor(path: string) {
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

  async init(path: string) {
    return await this.#workerRpc<string, boolean>("init", path);
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

  #workerRpc<T, R>(cmd: WorkerMessageCommand, args?: T) {
    const id = uuid();
    const msg = {
      id,
      cmd,
      args,
    } as WorkerMessage<T>;
    this.#worker.postMessage(msg);
    return new Promise<R>(resolve => {
      this.#commandQueue.set(id, (v, port) => {
        const cmdReply = v as WorkerMessage<R>;
        resolve(cmdReply.args);
      });
    });
  }
}
