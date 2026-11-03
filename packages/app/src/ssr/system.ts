import { type CachedMetadata, mapEventToProfile, type RequestBuilder, type TaggedNostrEvent } from "@snort/system"

declare global {
  function relayQuery(filters: string): string
}

function ask(filters: unknown[]): TaggedNostrEvent[] {
  if (filters.length === 0) return []
  const events = JSON.parse(relayQuery(JSON.stringify(filters))) as TaggedNostrEvent[]
  return events.map(ev => ({ ...ev, relays: [] }))
}

class ServerQuery {
  id: string
  snapshot: TaggedNostrEvent[]
  progress = 1
  constructor(id: string, snapshot: TaggedNostrEvent[]) {
    this.id = id
    this.snapshot = snapshot
  }
  on() {}
  off() {}
  once() {}
  start() {}
  cancel() {}
  uncancel() {}
  flush() {}
  feed = { add() {}, clear() {} }
}

const socialGraph = {
  getFollowDistance: () => 1000,
  followedByFriendsCount: () => 0,
  followedByFriends: () => new Set<string>(),
  getFollowedByFriends: () => new Set<string>(),
  size: () => ({ users: 0, follows: 0 }),
  setRoot: () => undefined,
  handleEvent: () => undefined,
  root: "",
}

function emptyCache<T>() {
  return {
    getFromCache: (_k?: string): T | undefined => undefined,
    get: async (_k?: string): Promise<T | undefined> => undefined,
    set: async () => {},
    subscribe: () => () => {},
    hook: () => () => {},
    snapshot: () => [] as T[],
    keysOnTable: () => [] as string[],
    cached: () => [] as string[],
    preload: async () => {},
    bulkSet: async () => {},
    discover: () => {},
    clear: async () => {},
  }
}

export class ServerSystem {
  #queries: Record<string, TaggedNostrEvent[]> = {}
  #profileEvents: Record<string, TaggedNostrEvent | null> = {}
  #profiles = new Map<string, CachedMetadata>()

  checkSigs = false
  pool = Object.assign(new Map(), { getConnection: () => undefined, on() {}, off() {} })
  cacheRelay = undefined
  requestRouter = undefined
  traceTimeline = undefined

  profile(pubkey?: string) {
    if (!pubkey || pubkey.length !== 64) return undefined
    if (!(pubkey in this.#profileEvents)) {
      const ev = ask([{ kinds: [0], authors: [pubkey], limit: 1 }])[0]
      this.#profileEvents[pubkey] = ev ?? null
      const profile = ev ? mapEventToProfile(ev) : undefined
      if (profile) this.#profiles.set(pubkey, profile)
    }
    return this.#profiles.get(pubkey)
  }

  readonly #profileCache = {
    ...emptyCache<CachedMetadata>(),
    getFromCache: (pubkey?: string) => this.profile(pubkey),
    get: async (pubkey?: string) => this.profile(pubkey),
  }

  config = {
    socialGraphInstance: socialGraph,
    profiles: this.#profileCache,
    relays: emptyCache(),
    contactLists: emptyCache(),
    automaticOutboxModel: false,
  }

  readonly profileLoader = {
    cache: this.#profileCache,
    TrackKeys: () => {},
    UntrackKeys: () => {},
  }

  readonly relayLoader = { cache: emptyCache(), TrackKeys: () => {}, UntrackKeys: () => {} }

  reset() {
    this.#queries = {}
    this.#profileEvents = {}
    this.#profiles = new Map()
  }

  data() {
    const profiles: Record<string, TaggedNostrEvent> = {}
    for (const [pubkey, ev] of Object.entries(this.#profileEvents)) if (ev) profiles[pubkey] = ev
    return { queries: this.#queries, profiles }
  }

  Query(rb: RequestBuilder) {
    if (!(rb.id in this.#queries)) {
      const filters = rb.numFilters > 0 ? rb.buildRaw() : []
      this.#queries[rb.id] = ask(filters)
    }
    return new ServerQuery(rb.id, this.#queries[rb.id])
  }

  GetQuery() {
    return undefined
  }
  async Fetch(rb: RequestBuilder) {
    return ask(rb.buildRaw())
  }
  async FetchAll() {}
  async Init() {}
  async PreloadSocialGraph() {}
  hydrateQuery() {}
  getHydrationData() {
    return this.#queries
  }
  HandleEvent() {}
  async ConnectToRelay() {}
  DisconnectRelay() {}
  async BroadcastEvent() {
    return []
  }
  async WriteOnceToRelay() {
    return { ok: false }
  }
  on() {}
  off() {}
  once() {}
  emit() {
    return false
  }
}
