/// <reference lib="webworker" />

import { NostrSystem, NostrsystemProps } from "../nostr-system";
import { WorkerMessage, WorkerCommand } from ".";

let system: NostrSystem | undefined;

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
function checkInitialized() {
  if (system === undefined) {
    throw new Error("System not initialized");
  }
}

globalThis.onmessage = async ev => {
  const data = ev.data as { id: string; type: WorkerCommand };
  try {
    switch (data.type) {
      case WorkerCommand.Init: {
        const cmd = ev.data as WorkerMessage<NostrsystemProps>;
        if (system === undefined) {
          system = new NostrSystem(cmd.data);
          await system.Init();
          okReply(data.id);
        } else {
          errorReply(data.id, "System is already initialized");
        }
        break;
      }
      case WorkerCommand.ConnectRelay: {
        checkInitialized();
        const cmd = ev.data as WorkerMessage<[string, { read: boolean; write: boolean }]>;
        await system?.ConnectToRelay(cmd.data[0], cmd.data[1]);
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
