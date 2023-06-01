import ExternalStore from "ExternalStore";
import {
  NoteStore,
  Query,
  RawEvent,
  RelaySettings,
  RequestBuilder,
  SystemSnapshot,
  SystemInterface,
  ConnectionStateSnapshot,
  AuthHandler,
} from "System";

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

  HandleAuth?: AuthHandler;

  get Sockets(): ConnectionStateSnapshot[] {
    throw new Error("Method not implemented.");
  }

  Query<T extends NoteStore>(type: new () => T, req: RequestBuilder | null): Query | undefined {
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

  BroadcastEvent(ev: RawEvent): void {
    throw new Error("Method not implemented.");
  }

  WriteOnceToRelay(relay: string, ev: RawEvent): Promise<void> {
    throw new Error("Method not implemented.");
  }

  takeSnapshot(): SystemSnapshot {
    throw new Error("Method not implemented.");
  }

  #onMessage(e: MessageEvent<any>) {
    console.debug(e);
  }
}
