/// <reference lib="webworker" />

import { WorkerRelay } from "./relay";
import { NostrEvent, ReqCommand, ReqFilter, WorkerMessage } from "./types";

const relay = new WorkerRelay();

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
  if (eventWriteQueue.length > 0) {
    relay.eventBatch(eventWriteQueue);
    eventWriteQueue = [];
  }
  setTimeout(() => insertBatch(), 100);
}
setTimeout(() => insertBatch(), 100);

globalThis.onclose = () => {
  relay.close();
};

globalThis.onmessage = async ev => {
  //console.debug(ev);

  const msg = ev.data as WorkerMessage<any>;
  try {
    switch (msg.cmd) {
      case "init": {
        await relay.init();
        reply(msg.id, true);
        break;
      }
      case "open": {
        await relay.open("/relay.db");
        reply(msg.id, true);
        break;
      }
      case "migrate": {
        relay.migrate();
        reply(msg.id, true);
        break;
      }
      case "event": {
        eventWriteQueue.push(msg.args as NostrEvent);
        reply(msg.id, true);
        break;
      }
      case "req": {
        const req = msg.args as ReqCommand;
        const results = [];
        for (const r of req.slice(2)) {
          results.push(...relay.req(r as ReqFilter));
        }
        reply(msg.id, results);
        break;
      }
      case "count": {
        const req = msg.args as ReqCommand;
        let results = 0;
        for (const r of req.slice(2)) {
          const c = relay.count(r as ReqFilter);
          results += c;
        }
        reply(msg.id, results);
        break;
      }
      case "summary": {
        const res = relay.summary();
        reply(msg.id, res);
        break;
      }
      default: {
        reply(msg.id, { error: "Unknown command" });
        break;
      }
    }
  } catch (e) {
    reply(msg.id, { error: e });
  }
};
