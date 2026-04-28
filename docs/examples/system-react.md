# @snort/system-react Examples

Real-world usage of React hooks from the Snort app.

## useUserProfile with IntersectionObserver ref

The `ref` parameter enables viewport-aware priority loading — visible elements get "high" priority, off-screen get "normal". This is used on every profile image in timelines to avoid overloading relay requests for off-screen avatars:

```typescript
// ProfileImage.tsx
const ref = useRef<HTMLDivElement>(null)
const user = useUserProfile(profile ? "" : pubkey, ref)
// ref is attached to the rendered wrapper div
```

When a profile prop is already provided, the hook is given an empty string key (effectively a no-op). For NIP-05 verification, the hook can be conditionally disabled:

```typescript
// Nip05.tsx
const spanRef = useRef<HTMLSpanElement>(null)
const profile = useUserProfile(pubkey && !nip05 ? pubkey : undefined, spanRef)
```

## Chained dependent queries with useRequestBuilder

Build a second query that depends on the first query's results:

```typescript
// useAppHandler.ts
const sub = useMemo(() => {
  if (!kind) return new RequestBuilder("empty")
  const sub = new RequestBuilder(`app-handler:${kind}`)
  sub.withFilter().kinds([31990 as EventKind]).tag("k", [kind.toString()])
  return sub
}, [kind])
const dataApps = useRequestBuilder(sub)

// Second query uses results from first
const recommendsSub = useMemo(() => {
  if (!kind || dataApps.length === 0) return new RequestBuilder("empty-recommends")
  const rb = new RequestBuilder(`app-handler:${kind}:recommends`)
  rb.withFilter()
    .kinds([31989 as EventKind])
    .replyToLink(dataApps.map(a => NostrLink.fromEvent(a)))
  return rb
}, [kind, dataApps.length])
const dataRecommends = useRequestBuilder(recommendsSub)
```

## Timeline with "show new posts" using useRequestBuilderAdvanced

The only usage of `useRequestBuilderAdvanced` in the app — enables a realtime subscription that collects new events, merged into the main feed on user action:

```typescript
// TimelineFeed.ts
const mainQuery = useRequestBuilderAdvanced(sub)
const main = useSyncExternalStore(
  h => {
    mainQuery.uncancel()
    mainQuery.on("event", h)
    mainQuery.start()
    return () => {
      mainQuery.flush()
      mainQuery.cancel()
      mainQuery.off("event", h)
    }
  },
  () => mainQuery?.snapshot,
)

// Realtime "latest" query
const subRealtime = useMemo(() => {
  const rb = createBuilder()
  rb.id = `${rb.id}:latest`
  rb.withOptions({ leaveOpen: true })
  for (const filter of rb.filterBuilders) {
    filter.limit(1).since(now)
  }
  return rb
}, [createBuilder, now])

const latestQuery = useRequestBuilderAdvanced(subRealtime)
const latest = useSyncExternalStore(/* same pattern */)

// Merge new events on user action
showLatest: () => {
  if (latest) {
    mainQuery?.feed.add(latest)
    latestQuery?.feed.clear()
  }
}
```

## Chaining useEventFeed → useEventsFeed

Load a profile badges event, extract its tags as `NostrLink[]`, then fetch all linked badge events:

```typescript
// BadgesFeed.ts
const profileBadgesLink = new NostrLink(NostrPrefix.Address, "profile_badges", EventKind.ProfileBadges, pubkey)
const profileBadges = useEventFeed(profileBadgesLink)
const links = NostrLink.fromTags(profileBadges?.tags ?? [])
const linkedEvents = useEventsFeed(`badges:${pubkey}`, links)
```

## Reactions pipeline: useReactions → useEventReactions

Fetch all reaction/repost/zap events for a note, filter out muted pubkeys, then parse into categorized groups:

```typescript
// NoteContext.tsx
const link = useMemo(() => NostrLink.fromEvent(ev), [ev.id])
const relatedRaw = useReactions(`reactions:${link.tagKey}`, link)
const related = useMemo(() => relatedRaw.filter(a => !isMuted(a.pubkey)), [relatedRaw, isMuted])
const reactions = useEventReactions(link, related)
// reactions.reactions.positive, .negative, .all
// reactions.reposts, reactions.zaps, reactions.replies, reactions.deletions
```

## useCached for API data, NIP-05 verification, and relay-backed cache

**API data caching with custom expiry:**

```typescript
// Referrals.tsx
const loader = useCallback(() => {
  const api = new SnortApi(undefined, publisher?.signer)
  return api.getRefCode()
}, [publisher])
const { data: refCode, reloadNow } = useCached<RefCodeResponse>(
  publisher ? `ref:${publisher.pubKey}` : undefined,
  loader,
  60 * 60 * 24,  // 24 hours
)
```

**NIP-05 verification with viewport gating:**

```typescript
// Nip05.tsx
const { data, error } = useCached(
  toSplit && inView && pubkey ? `nip5:${toSplit}` : undefined,
  async () => await fetchNip05PubkeyWithThrow(name, domain),
  Day,  // 1 day TTL
)
```

Key is `undefined` when not in view or no pubkey, preventing unnecessary fetches.

**Relay-backed cache using system.Fetch as loader:**

```typescript
// ArticlesFeed.ts
const loader = useCallback(async () => {
  return await system.Fetch(sub)
}, [sub, system])
const { data } = useCached("articles", loader, Hour * 6)
```

## SnortContext consumption via React 19 `use()`

The app uses React 19's `use()` API instead of `useContext()`:

```typescript
// useEventPublisher.tsx
const system = use(SnortContext)

// Direct cache access (synchronous, no subscription)
// Bookmarks.tsx
const profile = system.config.profiles.getFromCache(p)

// Connection pool access
// RelayState.ts
const c = system.pool.getConnection(addr)
```

## useUserSearch with debouncing

```typescript
// NewChatWindow.tsx
const search = useUserSearch()
useEffect(() => {
  return debounce(500, () => {
    if (term) {
      search(term).then(setResults)
    } else {
      setResults(followList)
    }
  })
}, [term, followList, search])
```
