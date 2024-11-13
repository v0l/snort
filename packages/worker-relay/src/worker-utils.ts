import { SqliteRelay } from "./sqlite/sqlite-relay";
import { InMemoryRelay } from "./memory-relay";
import { setLogging } from "./debug";

import {
    NostrEvent,
    ReqCommand,
    ReqFilter,
    WorkerMessage,
    unixNowMs,
    EventMetadata,
    OkResponse,
    RelayHandler,
  } from "./types";

import { getForYouFeed } from "forYouFeed";

export interface InitAargs {
  databasePath: string;
  insertBatchSize?: number;
}

export interface WorkerState {
  self: DedicatedWorkerGlobalScope;
  relay: RelayHandler | undefined;
  insertBatchSize: number;
  eventWriteQueue: Array<NostrEvent>;
}

export async function insertBatch(state: WorkerState) {
  if (state.eventWriteQueue.length > 0) {
    const start = unixNowMs();
    const timeLimit = 1000;
    if (state.relay) {
      while (state.eventWriteQueue.length > 0) {
        if (unixNowMs() - start >= timeLimit) {
          break;
        }
        const batch = state.eventWriteQueue.splice(0, state.insertBatchSize);
        state.eventWriteQueue = state.eventWriteQueue.slice(batch.length);
        state.relay.eventBatch(batch);
      }
    }
  }
  setTimeout(() => insertBatch(state), 100);
}

export const handleMsg = async (state: WorkerState, port: MessagePort | DedicatedWorkerGlobalScope, ev: MessageEvent) => {
  async function reply<T>(id: string, obj?: T) {
    port.postMessage({
      id,
      cmd: "reply",
      args: obj,
    } as WorkerMessage<T>);
  }

  const msg = ev.data as WorkerMessage<any>;
  try {
    switch (msg.cmd) {
      case "debug": {
        setLogging(true);
        reply(msg.id, true);
        break;
      }
      case "init": {
        const args = msg.args as InitAargs;
        state.insertBatchSize = args.insertBatchSize ?? 10;
        try {
          if ("WebAssembly" in state.self) {
            state.relay = new SqliteRelay();
          } else {
            state.relay = new InMemoryRelay();
          }
          await state.relay.init(args.databasePath);
        } catch (e) {
          console.error("Fallback to InMemoryRelay", e);
          state.relay = new InMemoryRelay();
          await state.relay.init(args.databasePath);
        }
        reply(msg.id, true);
        break;
      }
      case "event": {
        const ev = msg.args as NostrEvent;
        state.eventWriteQueue.push(ev);
        reply(msg.id, {
          ok: true,
          id: ev.id,
          relay: "",
        } as OkResponse);
        break;
      }
      case "close": {
        const res = state.relay!.close();
        reply(msg.id, res);
        break;
      }
      case "req": {
        const req = msg.args as ReqCommand;
        const filters = req.slice(2) as Array<ReqFilter>;
        const results: Array<string | NostrEvent> = [];
        const ids = new Set<string>();
        for (const r of filters) {
          const rx = state.relay!.req(req[1], r);
          for (const x of rx) {
            if ((typeof x === "string" && ids.has(x)) || ids.has((x as NostrEvent).id)) {
              continue;
            }
            ids.add(typeof x === "string" ? x : (x as NostrEvent).id);
            results.push(x);
          }
        }
        reply(msg.id, results);
        break;
      }
      case "count": {
        const req = msg.args as ReqCommand;
        let results = 0;
        const filters = req.slice(2) as Array<ReqFilter>;
        for (const r of filters) {
          const c = state.relay!.count(r);
          results += c;
        }
        reply(msg.id, results);
        break;
      }
      case "delete": {
        const req = msg.args as ReqCommand;
        let results = [];
        const filters = req.slice(2) as Array<ReqFilter>;
        for (const r of filters) {
          const c = state.relay!.delete(r);
          results.push(...c);
        }
        reply(msg.id, results);
        break;
      }
      case "summary": {
        const res = state.relay!.summary();
        reply(msg.id, res);
        break;
      }
      case "dumpDb": {
        const res = await state.relay!.dump();
        reply(msg.id, res);
        break;
      }
      case "wipe": {
        await state.relay!.wipe();
        reply(msg.id, true);
        break;
      }
      case "forYouFeed": {
        const res = await getForYouFeed(state.relay!, msg.args as string);
        reply(msg.id, res);
        break;
      }
      case "setEventMetadata": {
        const [id, metadata] = msg.args as [string, EventMetadata];
        state.relay!.setEventMetadata(id, metadata);
        break;
      }
      default: {
        reply(msg.id, { error: "Unknown command" });
        break;
      }
    }
  } catch (e) {
    if (e instanceof Error) {
      reply(msg.id, { error: e.message });
    } else if (typeof e === "string") {
      reply(msg.id, { error: e });
    } else {
      reply(msg.id, "Unknown error");
    }
  }
};