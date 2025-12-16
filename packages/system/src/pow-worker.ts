/// <reference lib="webworker" />

import { minePow, type NostrPowEvent } from "./pow-util";

export interface PowWorkerMessage {
  id: string;
  cmd: "req" | "rsp";
  event: NostrPowEvent;
  target: number;
}

globalThis.onmessage = ev => {
  const data = ev.data as PowWorkerMessage;
  if (data.cmd === "req") {
    queueMicrotask(() => {
      minePow(data.event, data.target);
      data.cmd = "rsp";
      globalThis.postMessage(data);
    });
  }
};
