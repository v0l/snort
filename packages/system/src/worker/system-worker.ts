import { v4 as uuid } from "uuid";
import EventEmitter from "eventemitter3";
import {
  NostrEvent,
  OkResponse,
  ProfileLoaderService,
  RelaySettings,
  RequestBuilder,
  SystemInterface,
  TaggedNostrEvent,
  CachedMetadata,
  RelayMetadataLoader,
  RelayMetricCache,
  RelayMetrics,
  UserProfileCache,
  UserRelaysCache,
  UsersRelays,
  QueryLike,
  Optimizer,
  DefaultOptimizer,
} from "..";
import { NostrSystemEvents, SystemConfig } from "../nostr-system";
import { WorkerCommand, WorkerMessage } from ".";
import { CachedTable } from "@snort/shared";
import { EventsCache } from "../cache/events";
import { RelayMetricHandler } from "../relay-metric-handler";
import debug from "debug";
import { ConnectionPool } from "../connection-pool";
import { CacheRelay } from "../cache-relay";

export class SystemWorker extends EventEmitter<NostrSystemEvents> implements SystemInterface {
  #log = debug("SystemWorker");
  #worker: Worker;
  #commandQueue: Map<string, (v: unknown) => void> = new Map();
  #config: SystemConfig;

  /**
   * Storage class for user relay lists
   */
  get relayCache(): CachedTable<UsersRelays> {
    return this.#config.relays;
  }

  /**
   * Storage class for user profiles
   */
  get profileCache(): CachedTable<CachedMetadata> {
    return this.#config.profiles;
  }

  /**
   * Storage class for relay metrics (connects/disconnects)
   */
  get relayMetricsCache(): CachedTable<RelayMetrics> {
    return this.#config.relayMetrics;
  }

  /**
   * Optimizer instance, contains optimized functions for processing data
   */
  get optimizer(): Optimizer {
    return this.#config.optimizer;
  }

  get eventsCache(): CachedTable<NostrEvent> {
    return this.#config.events;
  }

  /**
   * Check event signatures (recommended)
   */
  get checkSigs(): boolean {
    return this.#config.checkSigs;
  }

  set checkSigs(v: boolean) {
    this.#config.checkSigs = v;
  }

  get requestRouter() {
    return undefined;
  }

  get cacheRelay(): CacheRelay | undefined {
    return this.#config.cachingRelay;
  }

  get pool() {
    return {} as ConnectionPool;
  }

  readonly relayLoader: RelayMetadataLoader;
  readonly profileLoader: ProfileLoaderService;
  readonly relayMetricsHandler: RelayMetricHandler;

  constructor(scriptPath: string, props: Partial<SystemConfig>) {
    super();
    this.#config = {
      relays: props.relays ?? new UserRelaysCache(props.db?.userRelays),
      profiles: props.profiles ?? new UserProfileCache(props.db?.users),
      relayMetrics: props.relayMetrics ?? new RelayMetricCache(props.db?.relayMetrics),
      events: props.events ?? new EventsCache(props.db?.events),
      optimizer: props.optimizer ?? DefaultOptimizer,
      checkSigs: props.checkSigs ?? false,
      cachingRelay: props.cachingRelay,
      db: props.db,
      automaticOutboxModel: props.automaticOutboxModel ?? true,
    };

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

  get Sockets(): never[] {
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

  HandleEvent(subId: string, ev: TaggedNostrEvent): void {
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
