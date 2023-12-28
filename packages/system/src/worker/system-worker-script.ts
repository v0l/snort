/// <reference lib="webworker" />

import { NostrSystem, NostrsystemProps } from "../nostr-system";
import { NostrSystemMessage, NostrSystemCommand } from ".";

let system: NostrSystem | undefined;

function reply<T>(id: string, type: NostrSystemCommand, data: T) {
  globalThis.postMessage({
    id,
    type,
    data,
  } as NostrSystemMessage<T>);
}
function okReply(id: string, message?: string) {
  reply<string | undefined>(id, NostrSystemCommand.OkResponse, message);
}
function errorReply(id: string, message: string) {
  reply<string>(id, NostrSystemCommand.ErrorResponse, message);
}
function checkInitialized() {
  if (system === undefined) {
    throw new Error("System not initialized");
  }
}

globalThis.onmessage = async ev => {
  const data = ev.data as { id: string; type: NostrSystemCommand };
  try {
    switch (data.type) {
      case NostrSystemCommand.Init: {
        const cmd = ev.data as NostrSystemMessage<NostrsystemProps>;
        if (system === undefined) {
          system = new NostrSystem(cmd.data);
          await system.Init();
          okReply(data.id);
        } else {
          errorReply(data.id, "System is already initialized");
        }
        break;
      }
      case NostrSystemCommand.ConnectRelay: {
        checkInitialized();
        const cmd = ev.data as NostrSystemMessage<[string, { read: boolean; write: boolean }]>;
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
