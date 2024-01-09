/// <reference lib="webworker" />

import { NostrSystem } from "../nostr-system";
import { WorkerMessage, WorkerCommand } from ".";

const system = new NostrSystem({
  checkSigs: true,
});

function reply<T>(id: string, type: WorkerCommand, data: T) {
  globalThis.postMessage({
    id,
    type,
    data,
  } as WorkerMessage<T>);
}
function okReply(id: string, message?: string) {
  reply<string | undefined>(id, WorkerCommand.OkResponse, message);
}
function errorReply(id: string, message: string) {
  reply<string>(id, WorkerCommand.ErrorResponse, message);
}
globalThis.onmessage = async ev => {
  console.debug(ev);
  const data = ev.data as { id: string; type: WorkerCommand };
  try {
    switch (data.type) {
      case WorkerCommand.Init: {
        await system.Init();
        okReply(data.id);
        break;
      }
      case WorkerCommand.ConnectRelay: {
        const cmd = ev.data as WorkerMessage<[string, { read: boolean; write: boolean }]>;
        await system.ConnectToRelay(cmd.data[0], cmd.data[1]);
        okReply(data.id, "Connected");
        break;
      }
      default: {
        errorReply(data.id, "Unknown command");
        break;
      }
    }
  } catch (e) {
    if (e instanceof Error) {
      errorReply(data.id, e.message);
    }
  }
};
