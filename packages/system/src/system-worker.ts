import { ExternalStore } from "@snort/shared";

import { SystemSnapshot, SystemInterface, ProfileLoaderService } from ".";
import { AuthHandler, ConnectionStateSnapshot, RelaySettings } from "./connection";
import { NostrEvent, TaggedNostrEvent } from "./nostr";
import { NoteStore, NoteStoreSnapshotData } from "./note-collection";
import { Query } from "./query";
import { RequestBuilder } from "./request-builder";

export class SystemWorker extends ExternalStore<SystemSnapshot> implements SystemInterface {
  #port: MessagePort;

  constructor() {
    super();
    if ("SharedWorker" in window) {
      const worker = new SharedWorker("/system.js");
      this.#port = worker.port;
      this.#port.onmessage = m => this.#onMessage(m);
    } else {
      throw new Error("SharedWorker is not supported");
    }
  }
  
  Fetch(req: RequestBuilder, cb?: (evs: Array<TaggedNostrEvent>) => void) : Promise<NoteStoreSnapshotData> {
    throw new Error("Method not implemented.");
  }

  get ProfileLoader(): ProfileLoaderService {
    throw new Error("Method not implemented.");
  }

  HandleAuth?: AuthHandler;

  get Sockets(): ConnectionStateSnapshot[] {
    throw new Error("Method not implemented.");
  }

  Query<T extends NoteStore>(type: new () => T, req: RequestBuilder | null): Query {
    throw new Error("Method not implemented.");
  }

  CancelQuery(sub: string): void {
    throw new Error("Method not implemented.");
  }

  GetQuery(sub: string): Query | undefined {
    throw new Error("Method not implemented.");
  }

  ConnectToRelay(address: string, options: RelaySettings): Promise<void> {
    throw new Error("Method not implemented.");
  }

  DisconnectRelay(address: string): void {
    throw new Error("Method not implemented.");
  }

  BroadcastEvent(ev: NostrEvent): void {
    throw new Error("Method not implemented.");
  }

  WriteOnceToRelay(relay: string, ev: NostrEvent): Promise<void> {
    throw new Error("Method not implemented.");
  }

  takeSnapshot(): SystemSnapshot {
    throw new Error("Method not implemented.");
  }

  #onMessage(e: MessageEvent<any>) {
    console.debug(e);
  }
}
