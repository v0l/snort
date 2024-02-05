/// <reference lib="webworker" />

import { InMemoryRelay } from "./memory-relay";
import { WorkQueueItem, barrierQueue, processWorkQueue } from "./queue";
import { SqliteRelay } from "./sqlite-relay";
import { NostrEvent, RelayHandler, ReqCommand, ReqFilter, WorkerMessage, unixNowMs, EventMetadata } from "./types";
import { getForYouFeed } from "./forYouFeed";

let relay: RelayHandler | undefined;

async function reply<T>(id: string, obj?: T) {
  globalThis.postMessage({
    id,
    cmd: "reply",
    args: obj,
  } as WorkerMessage<T>);
}

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
          const batch = eventWriteQueue.splice(0, 10);
          eventWriteQueue = eventWriteQueue.slice(batch.length);
          relay.eventBatch(batch);
        }
      }
    });
  }
  setTimeout(() => insertBatch(), 100);
}
setTimeout(() => insertBatch(), 100);

const cmdQueue: Array<WorkQueueItem> = [];
processWorkQueue(cmdQueue, 50);

async function tryOpfs() {
  try {
    await navigator.storage.getDirectory();
    return true;
  } catch {
    // ignore
  }
  return false;
}

globalThis.onclose = () => {
  relay?.close();
};

globalThis.onmessage = async ev => {
  const msg = ev.data as WorkerMessage<any>;
  try {
    switch (msg.cmd) {
      case "init": {
        await barrierQueue(cmdQueue, async () => {
          if ("WebAssembly" in globalThis && (await tryOpfs())) {
            relay = new SqliteRelay();
          } else {
            relay = new InMemoryRelay();
          }
          await relay.init(msg.args as string);
          reply(msg.id, true);
        });
        break;
      }
      case "event": {
        eventWriteQueue.push(msg.args as NostrEvent);
        reply(msg.id, true);
        break;
      }
      case "close": {
        reply(msg.id, true);
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
    console.error(e);
    reply(msg.id, { error: e });
  }
};
