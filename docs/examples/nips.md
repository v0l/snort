# NIP Implementation Examples

Real-world usage of NIP utilities from the Snort app.

## Nip10.parseThread for notification routing

When a repost or reaction arrives as a notification, parse its thread to find what was referenced:

```typescript
// getNotificationContext.tsx
case EventKind.Repost: {
  const thread = Nip10.parseThread(ev)
  return thread?.replyTo ?? thread?.root ?? thread?.mentions[0]
}
case EventKind.Reaction: {
  const thread = Nip10.parseThread(ev)
  return thread?.replyTo ?? thread?.root ?? thread?.mentions[0]
}
```

## Nip10.linkToTag for live stream chat

```typescript
// livekit.tsx
const link = NostrLink.fromEvent(ev)
return eb
  .kind(10_312 as EventKind)
  .tag(Nip10.linkToTag(link))
```

## Nip11.loadRelayDocument for relay info UI

```typescript
// RelayInfo.tsx
Nip11.loadRelayDocument(params.id ?? "")
  .then(info => setInfo(info))
  .catch(console.error)
```

## Nip18 quote repost with linkToTag

```typescript
// NoteCreator.tsx
const link = NostrLink.fromEvent(note.quote)
link.scope = LinkScope.Quote
note.note += `nostr:${link.encode(CONFIG.eventLinkPrefix)}`
const quoteTag = Nip18.linkToTag(link)
extraTags?.push(quoteTag)
```

## Nip94 file metadata (imeta tags) in note creation

```typescript
// NoteCreator.tsx
const n94 = (at.nip94?.length ?? 0) > 0
  ? readNip94Tags(at.nip94!)
  : ({ url: at.url, hash: at.sha256, size: at.size, mimeType: at.type } as Nip94Tags)

n94.fallback ??= []
n94.fallback.push(...v.slice(1).filter(a => a.url).map(a => a.url!))
extraTags?.push(nip94TagsToIMeta(n94))
```

## parseZap for zap receipt parsing

```typescript
// ZapsFeed.ts
const parsedZaps = zapsFeed.map(a => parseZap(a)).filter(z => z.valid)
return parsedZaps.sort((a, b) => b.amount - a.amount)
```

## parseRelayTags for relay list parsing

```typescript
// RelaysFeed.tsx
b.withFilter().authors([pubkey]).kinds([EventKind.Relays])
const relays = useRequestBuilder(sub)
return parseRelayTags(relays[0]?.tags.filter(a => a[0] === "r") ?? [])
```

## DVM job requests

```typescript
// useDvmLinks.ts
const job = new DVMJobRequest(kind)
job.setServiceProvider(provider)
job.setParam(k, v)
job.addInput(i)
job.addRelay(r)

job.on("result", e => setResult(e))
job.on("error", e => setError(new Error(e)))
job.request(signer, system, relays)
```
