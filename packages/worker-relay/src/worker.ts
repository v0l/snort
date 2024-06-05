/// <reference lib="webworker" />

import { SqliteRelay } from "./sqlite/sqlite-relay";
import { InMemoryRelay } from "./memory-relay";
import { setLogging } from "./debug";
import { WorkQueueItem, barrierQueue, processWorkQueue } from "./queue";
import {
  NostrEvent,
  RelayHandler,
  ReqCommand,
  ReqFilter,
  WorkerMessage,
  unixNowMs,
  EventMetadata,
  OkResponse,
} from "./types";
import { getForYouFeed } from "./forYouFeed";

let relay: RelayHandler | undefined;
let insertBatchSize = 10;

// Event inserter queue
let eventWriteQueue: Array<NostrEvent> = [];
async function insertBatch() {
  // Only insert event batches when the command queue is empty
  // This is to make req's execute first and not block them
  if (eventWriteQueue.length > 0 && cmdQueue.length === 0) {
    await barrierQueue(cmdQueue, async () => {
      const start = unixNowMs();
      const timeLimit = 1000;
      if (relay) {
        while (eventWriteQueue.length > 0) {
          if (unixNowMs() - start >= timeLimit) {
            //console.debug("Yield insert, queue length: ", eventWriteQueue.length, ", cmds: ", cmdQueue.length);
            break;
          }
          const batch = eventWriteQueue.splice(0, insertBatchSize);
          eventWriteQueue = eventWriteQueue.slice(batch.length);
          relay.eventBatch(batch);
        }
      }
    });
  }
  setTimeout(() => insertBatch(), 100);
}

const cmdQueue: Array<WorkQueueItem> = [];
try {
  setTimeout(() => insertBatch(), 100);
  processWorkQueue(cmdQueue, 50);
} catch (e) {
  console.error(e);
}

interface InitAargs {
  databasePath: string;
  insertBatchSize?: number;
}

const handleMsg = async (port: MessagePort | DedicatedWorkerGlobalScope, ev: MessageEvent) => {
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
        await barrierQueue(cmdQueue, async () => {
          const args = msg.args as InitAargs;
          insertBatchSize = args.insertBatchSize ?? 10;
          try {
            if ("WebAssembly" in self) {
              relay = new SqliteRelay();
            } else {
              relay = new InMemoryRelay();
            }
            await relay.init(args.databasePath);
          } catch (e) {
            console.error("Fallback to InMemoryRelay", e);
            relay = new InMemoryRelay();
            await relay.init(args.databasePath);
          }
          reply(msg.id, true);
        });
        break;
      }
      case "event": {
        const ev = msg.args as NostrEvent;
        eventWriteQueue.push(ev);
        reply(msg.id, {
          ok: true,
          id: ev.id,
          relay: "",
        } as OkResponse);
        break;
      }
      case "close": {
        await barrierQueue(cmdQueue, async () => {
          const res = relay!.close();
          reply(msg.id, res);
        });
        break;
      }
      case "req": {
        await barrierQueue(cmdQueue, async () => {
          const req = msg.args as ReqCommand;
          const filters = req.slice(2) as Array<ReqFilter>;
          const results: Array<string | NostrEvent> = [];
          const ids = new Set<string>();
          for (const r of filters) {
            const rx = relay!.req(req[1], r);
            for (const x of rx) {
              if ((typeof x === "string" && ids.has(x)) || ids.has((x as NostrEvent).id)) {
                continue;
              }
              ids.add(typeof x === "string" ? x : (x as NostrEvent).id);
              results.push(x);
            }
          }
          reply(msg.id, results);
        });
        break;
      }
      case "count": {
        await barrierQueue(cmdQueue, async () => {
          const req = msg.args as ReqCommand;
          let results = 0;
          const filters = req.slice(2) as Array<ReqFilter>;
          for (const r of filters) {
            const c = relay!.count(r);
            results += c;
          }
          reply(msg.id, results);
        });
        break;
      }
      case "delete": {
        console.debug("DELETE", msg.args);
        await barrierQueue(cmdQueue, async () => {
          const req = msg.args as ReqCommand;
          let results = [];
          const filters = req.slice(2) as Array<ReqFilter>;
          for (const r of filters) {
            const c = relay!.delete(r);
            results.push(...c);
          }
          reply(msg.id, results);
        });
        break;
      }
      case "summary": {
        await barrierQueue(cmdQueue, async () => {
          const res = relay!.summary();
          reply(msg.id, res);
        });
        break;
      }
      case "dumpDb": {
        await barrierQueue(cmdQueue, async () => {
          const res = await relay!.dump();
          reply(msg.id, res);
        });
        break;
      }
      case "forYouFeed": {
        await barrierQueue(cmdQueue, async () => {
          const res = await getForYouFeed(relay!, msg.args as string);
          reply(msg.id, res);
        });
        break;
      }
      case "setEventMetadata": {
        await barrierQueue(cmdQueue, async () => {
          const [id, metadata] = msg.args as [string, EventMetadata];
          relay!.setEventMetadata(id, metadata);
        });
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

if ("SharedWorkerGlobalScope" in globalThis) {
  onconnect = e => {
    const port = e.ports[0];
    port.onmessage = msg => handleMsg(port, msg);
    port.start();
  };
}
if ("DedicatedWorkerGlobalScope" in globalThis) {
  onmessage = e => {
    handleMsg(self as DedicatedWorkerGlobalScope, e);
  };
}
