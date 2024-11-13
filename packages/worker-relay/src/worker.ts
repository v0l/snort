/// <reference lib="webworker" />

import { handleMsg, insertBatch, WorkerState } from "./worker-utils";

const state: WorkerState = {
  self: self as DedicatedWorkerGlobalScope,
  relay: undefined,
  insertBatchSize: 10,
  eventWriteQueue: []
}

try {
  setTimeout(() => insertBatch(state), 100);
} catch (e) {
  console.error(e);
}

if ("SharedWorkerGlobalScope" in globalThis) {
  onconnect = e => {
    const port = e.ports[0];
    port.onmessage = (msg: MessageEvent)  => handleMsg(state, port, msg);
    port.start();
  };
}
if ("DedicatedWorkerGlobalScope" in globalThis) {
  onmessage = e => {
    handleMsg(state, self as DedicatedWorkerGlobalScope, e);
  };
}