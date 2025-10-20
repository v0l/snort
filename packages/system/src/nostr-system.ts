import debug from "debug";

import { unixNowMs } from "@snort/shared";
import { NostrEvent, TaggedNostrEvent, OkResponse } from "./nostr";
import { RelaySettings } from "./connection";
import { BuiltRawReqFilter, RequestBuilder } from "./request-builder";
import { RelayMetricHandler } from "./relay-metric-handler";
import { TraceTimeline } from "./trace-timeline";
import {
  ProfileLoaderService,
  SystemInterface,
  SystemSnapshot,
  QueryLike,
  OutboxModel,
  EventKind,
  SystemConfig,
} from ".";
import { RelayMetadataLoader } from "./outbox";
import { ConnectionPool, DefaultConnectionPool } from "./connection-pool";
import { QueryManager } from "./query-manager";
import { RequestRouter } from "./request-router";
import { SystemBase } from "./system-base";
import { SocialGraph } from "nostr-social-graph";
import { base64 } from "@scure/base";

/**
 * Manages nostr content retrieval system
 */
export class NostrSystem extends SystemBase implements SystemInterface {
  #log = debug("System");
  #queryManager: QueryManager;

  readonly profileLoader: ProfileLoaderService;
  readonly relayMetricsHandler: RelayMetricHandler;
  readonly pool: ConnectionPool;
  readonly relayLoader: RelayMetadataLoader;
  readonly requestRouter: RequestRouter | undefined;
  readonly traceTimeline: TraceTimeline;

  constructor(props: Partial<SystemConfig>) {
    super(props);

    this.profileLoader = new ProfileLoaderService(this, this.profileCache);
    this.relayMetricsHandler = new RelayMetricHandler(this.relayMetricsCache);
    this.relayLoader = new RelayMetadataLoader(this, this.relayCache);
    this.traceTimeline = new TraceTimeline();

    // if automatic outbox model, setup request router as OutboxModel
    if (this.config.automaticOutboxModel) {
      this.requestRouter = OutboxModel.fromSystem(this);
    }

    // Cache everything
    if (this.config.cachingRelay) {
      this.on("event", async (_, ev) => {
        await this.config.cachingRelay?.event(ev);
      });
    }

    // Hook on-event when building follow graph
    if (this.config.buildFollowGraph) {
      let evBuf: Array<TaggedNostrEvent> = [];
      let t: ReturnType<typeof setTimeout> | undefined;
      this.on("event", (_, ev) => {
        if (ev.kind === EventKind.ContactList) {
          // fire&forget update
          this.userFollowsCache.update({
            loaded: unixNowMs(),
            created: ev.created_at,
            pubkey: ev.pubkey,
            follows: ev.tags,
          });

          // buffer social graph updates into 500ms window
          evBuf.push(ev);
          if (!t) {
            t = setTimeout(() => {
              this.config.socialGraphInstance.handleEvent(evBuf);
              evBuf = [];
            }, 500);
          }
        }
      });
    }

    this.pool = new DefaultConnectionPool(this);
    this.#queryManager = new QueryManager(this);

    // hook connection pool
    this.pool.on("connected", (id, wasReconnect) => {
      const c = this.pool.getConnection(id);
      if (c) {
        this.relayMetricsHandler.onConnect(c.address);
      }
    });
    this.pool.on("connectFailed", address => {
      this.relayMetricsHandler.onDisconnect(address, 0);
    });
    this.pool.on("event", (_, sub, ev) => {
      ev.relays?.length && this.relayMetricsHandler.onEvent(ev.relays[0]);
      this.emit("event", sub, ev);
    });
    this.pool.on("disconnect", (id, code) => {
      const c = this.pool.getConnection(id);
      if (c) {
        this.relayMetricsHandler.onDisconnect(c.address, code);
      }
    });
    this.pool.on("auth", (_, c, r, cb) => this.emit("auth", c, r, cb));
    this.pool.on("notice", (addr, msg) => {
      this.#log("NOTICE: %s %s", addr, msg);
    });
    this.#queryManager.on("change", () => this.emit("change", this.takeSnapshot()));
    this.#queryManager.on("trace", (event, queryName) => {
      this.relayMetricsHandler.onTraceEvent(event);
      this.traceTimeline.addTrace(event, queryName);
    });
    this.#queryManager.on("request", (subId: string, f: BuiltRawReqFilter) => this.emit("request", subId, f));
  }

  async Init(follows?: Array<string>) {
    const t = [
      this.relayCache.preload(follows),
      this.profileCache.preload(follows),
      this.relayMetricsCache.preload(follows),
      this.eventsCache.preload(follows),
      this.userFollowsCache.preload(follows),
    ];
    await Promise.all(t);
    await this.PreloadSocialGraph(follows);
  }

  async PreloadSocialGraph(follows?: Array<string>, root?: string) {
    // Insert data to socialGraph from cache
    if (this.config.buildFollowGraph) {
      const graphRoot = root ?? "00".repeat(32);
      // load saved social graph
      if ("localStorage" in globalThis) {
        const saved = localStorage.getItem("social-graph");
        if (saved) {
          try {
            const data = base64.decode(saved);
            this.config.socialGraphInstance = await SocialGraph.fromBinary(graphRoot, data);
            this.#log("Loaded social graph snapshot from LocalStorage %d bytes", data.length);
          } catch (e) {
            this.#log("Failed to load serialzied social-graph: %O", e);
            localStorage.removeItem("social-graph");
          }
        }
      }
      await this.config.socialGraphInstance.setRoot(graphRoot);
      for (const list of this.userFollowsCache.snapshot()) {
        if (follows && !follows.includes(list.pubkey)) continue;
        this.config.socialGraphInstance.handleEvent({
          id: "",
          sig: "",
          content: "",
          kind: 3,
          pubkey: list.pubkey,
          created_at: list.created,
          tags: list.follows,
        });
      }
    }
  }

  async ConnectToRelay(address: string, options: RelaySettings) {
    await this.pool.connect(address, options, false);
  }

  ConnectEphemeralRelay(address: string) {
    return this.pool.connect(address, { read: true, write: true }, true);
  }

  DisconnectRelay(address: string) {
    this.pool.disconnect(address);
  }

  GetQuery(id: string): QueryLike | undefined {
    return this.#queryManager.get(id);
  }

  Fetch(req: RequestBuilder, cb?: (evs: Array<TaggedNostrEvent>) => void) {
    return this.#queryManager.fetch(req, cb);
  }

  Query(req: RequestBuilder): QueryLike {
    return this.#queryManager.query(req);
  }

  HandleEvent(subId: string, ev: TaggedNostrEvent) {
    this.emit("event", subId, ev);
    this.#queryManager.handleEvent(ev);
  }

  async BroadcastEvent(ev: NostrEvent, cb?: (rsp: OkResponse) => void): Promise<OkResponse[]> {
    this.HandleEvent("*", { ...ev, relays: [] });
    return await this.pool.broadcast(ev, cb);
  }

  async WriteOnceToRelay(address: string, ev: NostrEvent): Promise<OkResponse> {
    return await this.pool.broadcastTo(address, ev);
  }

  takeSnapshot(): SystemSnapshot {
    return {
      queries: [...this.#queryManager].map(([, a]) => {
        return {
          id: a.id,
          filters: a.filters,
          subFilters: [],
        };
      }),
    };
  }
}
