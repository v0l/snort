import { v4 as uuid } from "uuid";
import EventEmitter from "eventemitter3";
import {
  ConnectionStateSnapshot,
  NostrEvent,
  OkResponse,
  ProfileLoaderService,
  RelaySettings,
  RequestBuilder,
  SystemInterface,
  TaggedNostrEvent,
  CachedMetadata,
  DefaultOptimizer,
  RelayMetadataLoader,
  RelayMetricCache,
  RelayMetrics,
  UserProfileCache,
  UserRelaysCache,
  UsersRelays,
  QueryLike,
} from "..";
import { NostrSystemEvents, NostrsystemProps } from "../nostr-system";
import { WorkerCommand, WorkerMessage } from ".";
import { CachedTable } from "@snort/shared";
import { EventsCache } from "../cache/events";
import { RelayMetricHandler } from "../relay-metric-handler";
import debug from "debug";
import { ConnectionPool } from "connection-pool";

export class SystemWorker extends EventEmitter<NostrSystemEvents> implements SystemInterface {
  #log = debug("SystemWorker");
  #worker: Worker;
  #commandQueue: Map<string, (v: unknown) => void> = new Map();
  readonly relayCache: CachedTable<UsersRelays>;
  readonly profileCache: CachedTable<CachedMetadata>;
  readonly relayMetricsCache: CachedTable<RelayMetrics>;
  readonly profileLoader: ProfileLoaderService;
  readonly relayMetricsHandler: RelayMetricHandler;
  readonly eventsCache: CachedTable<NostrEvent>;
  readonly relayLoader: RelayMetadataLoader;

  get checkSigs() {
    return true;
  }

  set checkSigs(v: boolean) {
    // not used
  }

  get optimizer() {
    return DefaultOptimizer;
  }

  get pool() {
    return {} as ConnectionPool;
  }

  constructor(scriptPath: string, props: NostrsystemProps) {
    super();

    this.relayCache = props.relayCache ?? new UserRelaysCache(props.db?.userRelays);
    this.profileCache = props.profileCache ?? new UserProfileCache(props.db?.users);
    this.relayMetricsCache = props.relayMetrics ?? new RelayMetricCache(props.db?.relayMetrics);
    this.eventsCache = props.eventsCache ?? new EventsCache(props.db?.events);

    this.profileLoader = new ProfileLoaderService(this, this.profileCache);
    this.relayMetricsHandler = new RelayMetricHandler(this.relayMetricsCache);
    this.relayLoader = new RelayMetadataLoader(this, this.relayCache);
    this.#worker = new Worker(scriptPath, {
      name: "SystemWorker",
      type: "module",
    });
    this.#worker.onmessage = async e => {
      const cmd = e.data as { id: string; type: WorkerCommand; data?: unknown };
      if (cmd.type === WorkerCommand.OkResponse) {
        const q = this.#commandQueue.get(cmd.id);
        q?.(cmd.data);
        this.#commandQueue.delete(cmd.id);
      }
    };
  }

  get Sockets(): ConnectionStateSnapshot[] {
    return [];
  }

  async Init() {
    await this.#workerRpc(WorkerCommand.Init);
  }

  GetQuery(id: string): QueryLike | undefined {
    return undefined;
  }

  Query(req: RequestBuilder): QueryLike {
    const chan = this.#workerRpc<[RequestBuilder], { id: string; port: MessagePort }>(WorkerCommand.Query, [req]);
    return {
      on: (_: "event", cb) => {
        chan.then(c => {
          c.port.onmessage = e => {
            //cb(e.data as Array<TaggedNostrEvent>);
          };
        });
      },
      off: (_: "event", cb) => {
        chan.then(c => {
          c.port.close();
        });
      },
      cancel: () => {},
      uncancel: () => {},
    } as QueryLike;
  }

  Fetch(req: RequestBuilder, cb?: ((evs: TaggedNostrEvent[]) => void) | undefined): Promise<TaggedNostrEvent[]> {
    throw new Error("Method not implemented.");
  }

  async ConnectToRelay(address: string, options: RelaySettings) {
    await this.#workerRpc(WorkerCommand.ConnectRelay, [address, options, false]);
  }

  DisconnectRelay(address: string): void {
    this.#workerRpc(WorkerCommand.DisconnectRelay, address);
  }

  HandleEvent(ev: TaggedNostrEvent): void {
    throw new Error("Method not implemented.");
  }

  BroadcastEvent(ev: NostrEvent, cb?: ((rsp: OkResponse) => void) | undefined): Promise<OkResponse[]> {
    throw new Error("Method not implemented.");
  }

  WriteOnceToRelay(relay: string, ev: NostrEvent): Promise<OkResponse> {
    throw new Error("Method not implemented.");
  }

  #workerRpc<T, R>(type: WorkerCommand, data?: T, timeout = 5_000) {
    const id = uuid();
    const msg = {
      id,
      type,
      data,
    } as WorkerMessage<T>;
    this.#log(msg);
    this.#worker.postMessage(msg);
    return new Promise<R>((resolve, reject) => {
      let t: ReturnType<typeof setTimeout>;
      this.#commandQueue.set(id, v => {
        clearTimeout(t);
        const cmdReply = v as WorkerMessage<R>;
        if (cmdReply.type === WorkerCommand.OkResponse) {
          resolve(cmdReply.data);
        } else {
          reject(cmdReply.data);
        }
      });
      t = setTimeout(() => {
        reject("timeout");
      }, timeout);
    });
  }
}
