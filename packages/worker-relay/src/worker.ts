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

globalThis.onmessage = async ev => {
  //console.debug(ev);

  const msg = ev.data as WorkerMessage<any>;
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
      await relay.migrate();
      reply(msg.id, true);
      break;
    }
    case "event": {
      await relay.event(msg.args as NostrEvent);
      reply(msg.id, true);
      break;
    }
    case "req": {
      const req = msg.args as ReqCommand;
      const results = [];
      for (const r of req.slice(2)) {
        results.push(...(await relay.req(r as ReqFilter)));
      }
      reply(msg.id, results);
      break;
    }
    default: {
      reply(msg.id, { error: "Unknown command" });
      break;
    }
  }
};
