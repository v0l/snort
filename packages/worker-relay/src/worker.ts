/// <reference lib="webworker" />

import { WorkQueueItem, barrierQueue, processWorkQueue } from "./queue";
import { WorkerRelay } from "./relay";
import { NostrEvent, ReqCommand, ReqFilter, WorkerMessage } from "./types";

interface PortedFilter {
  filters: Array<ReqFilter>;
  port: MessagePort;
}

// Active open subscriptions awaiting new events
const ActiveSubscriptions = new Map<string, PortedFilter>();

const relay = new WorkerRelay();
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
  if (eventWriteQueue.length > 0) {
    relay.eventBatch(eventWriteQueue);
    eventWriteQueue = [];
  }
  setTimeout(() => insertBatch(), 100);
}
setTimeout(() => insertBatch(), 100);

const cmdQueue: Array<WorkQueueItem> = [];
processWorkQueue(cmdQueue, 50);

globalThis.onclose = () => {
  relay.close();
};

globalThis.onmessage = ev => {
  const msg = ev.data as WorkerMessage<any>;
  try {
    switch (msg.cmd) {
      case "init": {
        barrierQueue(cmdQueue, async () => {
          await relay.init();
          reply(msg.id, true);
        });
        break;
      }
      case "open": {
        barrierQueue(cmdQueue, async () => {
          await relay.open("/relay.db");
          reply(msg.id, true);
        });
        break;
      }
      case "migrate": {
        barrierQueue(cmdQueue, async () => {
          relay.migrate();
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
        barrierQueue(cmdQueue, async () => {
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
            results.push(...relay.req(req.id, r as ReqFilter));
          }
          reply(msg.id, results, req.leaveOpen ? [chan.port2] : undefined);
        });
        break;
      }
      case "count": {
        barrierQueue(cmdQueue, async () => {
          const req = msg.args as ReqCommand;
          let results = 0;
          for (const r of req.filters) {
            const c = relay.count(r as ReqFilter);
            results += c;
          }
          reply(msg.id, results);
        });
        break;
      }
      case "summary": {
        barrierQueue(cmdQueue, async () => {
          const res = relay.summary();
          reply(msg.id, res);
        });
        break;
      }
      case "dumpDb": {
        barrierQueue(cmdQueue, async () => {
          const res = await relay.dump();
          reply(msg.id, res);
        });
        break;
      }
      case "sql": {
        barrierQueue(cmdQueue, async () => {
          const req = msg.args as {
            sql: string;
            params: Array<any>;
          };
          const res = relay.sql(req.sql, req.params);
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

export function eventMatchesFilter(ev: NostrEvent, filter: ReqFilter) {
  if (filter.since && ev.created_at < filter.since) {
    return false;
  }
  if (filter.until && ev.created_at > filter.until) {
    return false;
  }
  if (!(filter.ids?.includes(ev.id) ?? true)) {
    return false;
  }
  if (!(filter.authors?.includes(ev.pubkey) ?? true)) {
    return false;
  }
  if (!(filter.kinds?.includes(ev.kind) ?? true)) {
    return false;
  }
  return true;
}
