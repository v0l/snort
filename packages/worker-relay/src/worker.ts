/// <reference lib="webworker" />

import { InMemoryRelay } from "./memory-relay";
import { WorkQueueItem, barrierQueue, processWorkQueue } from "./queue";
import { WorkerRelay } from "./relay";
import { NostrEvent, RelayHandler, ReqCommand, ReqFilter, WorkerMessage, eventMatchesFilter } from "./types";

interface PortedFilter {
  filters: Array<ReqFilter>;
  port: MessagePort;
}

// Active open subscriptions awaiting new events
const ActiveSubscriptions = new Map<string, PortedFilter>();

let relay: RelayHandler | undefined;

async function reply<T>(id: string, obj?: T, transferables?: Transferable[]) {
  globalThis.postMessage(
    {
      id,
      cmd: "reply",
      args: obj,
    } as WorkerMessage<T>,
    transferables ?? [],
  );
}

// Event inserter queue
let eventWriteQueue: Array<NostrEvent> = [];
async function insertBatch() {
  // Only insert event batches when the command queue is empty
  // This is to make req's execute first and not block them
  if (relay && eventWriteQueue.length > 0 && cmdQueue.length === 0) {
    relay.eventBatch(eventWriteQueue);
    eventWriteQueue = [];
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
            relay = new WorkerRelay();
          } else {
            relay = new InMemoryRelay();
          }

          relay.on("event", evs => {
            for (const pf of ActiveSubscriptions.values()) {
              const pfSend = [];
              for (const ev of evs) {
                for (const fx of pf.filters) {
                  if (eventMatchesFilter(ev, fx)) {
                    pfSend.push(ev);
                    continue;
                  }
                }
              }
              if (pfSend.length > 0) {
                pf.port.postMessage(pfSend);
              }
            }
          });
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
        ActiveSubscriptions.delete(msg.args as string);
        reply(msg.id, true);
        break;
      }
      case "req": {
        await barrierQueue(cmdQueue, async () => {
          const req = msg.args as ReqCommand;
          const chan = new MessageChannel();
          if (req.leaveOpen) {
            ActiveSubscriptions.set(req.id, {
              filters: req.filters,
              port: chan.port1,
            });
          }
          const results = [];
          for (const r of req.filters) {
            results.push(...relay!.req(req.id, r as ReqFilter));
          }
          reply(msg.id, results, req.leaveOpen ? [chan.port2] : undefined);
        });
        break;
      }
      case "count": {
        await barrierQueue(cmdQueue, async () => {
          const req = msg.args as ReqCommand;
          let results = 0;
          for (const r of req.filters) {
            const c = relay!.count(r as ReqFilter);
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
      case "sql": {
        await barrierQueue(cmdQueue, async () => {
          const req = msg.args as {
            sql: string;
            params: Array<any>;
          };
          const res = relay!.sql(req.sql, req.params);
          reply(msg.id, res);
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
