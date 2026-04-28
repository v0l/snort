# Query System Examples

Real-world usage of `RequestBuilder`, `Query`, `RangeSync`, and `OutboxModel` from the Snort app.

## Zap feed subscription

```typescript
// ZapsFeed.ts
const sub = useMemo(() => {
  const b = new RequestBuilder(`zaps:${link?.encode()}`)
  if (link) {
    b.withFilter().kinds([EventKind.ZapReceipt]).replyToLink([link])
  }
  return b
}, [link])
const zapsFeed = useRequestBuilder(sub)
const parsedZaps = zapsFeed.map(a => parseZap(a)).filter(z => z.valid)
```

## Timeline feed with subject-based filtering

```typescript
// TimelineFeed.ts
const b = new RequestBuilder(`timeline:${subject.type}:${subject.discriminator}`)
const f = b.withFilter().kinds(kinds)

switch (subject.type) {
  case "pubkey": f.authors(subject.items); break
  case "hashtag": f.tag("t", subject.items); break
  case "ptag": f.tag("p", subject.items); break
  case "post_keyword": f.search(subject.items[0]); break
}
subject.extra?.(b)
```

## NIP-17 chat with useSyncModule

```typescript
// chat/nip17.ts
const rb = new RequestBuilder(`nip17:${pk?.slice(0, 12)}`)
if (pk && !session.readonly) {
  rb.withOptions({ useSyncModule: true })
  rb.withFilter().kinds([EventKind.GiftWrap]).tag("p", [pk])
}
```

## Historical event sync with RangeSync

```typescript
// sync-account.tsx
const sync = RangeSync.forSystem(system)
sync.on("event", evs => setResults(r => [...r, ...evs]))
sync.on("scan", t => setScan(t))
await sync.sync({
  authors: [unwrap(login.publicKey)],
  relays: [...relays, ...Object.keys(CONFIG.defaultRelays)],
})
```

## Relay discovery with OutboxModel

```typescript
// discover.tsx
const outbox = OutboxModel.fromSystem(system)
const topWriteRelays = outbox
  .pickTopRelays(follows ?? [], 1e31, "write")
  .filter(a => !(relays?.some(b => b.url === a.key) ?? false))
```

## Direct query execution (not via React hooks)

```typescript
// ForYouTab.tsx
const q = System.Query(rb1)
q.snapshot.forEach((ev: TaggedNostrEvent) => { /* ... */ })
```
