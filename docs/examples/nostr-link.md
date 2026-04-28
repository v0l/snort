# NostrLink Examples

Real-world usage of `NostrLink`, `UnknownTag`, and `NostrHashtagLink` from the Snort app.

## NostrLink.publicKey() for follow/unfollow operations

```typescript
// useFollowControls.ts
state.follow(NostrLink.publicKey(p))
state.unfollow(NostrLink.publicKey(p))
state.replaceFollows(pk.map(a => NostrLink.publicKey(a)))
```

## NostrLink.profile() with relay hints

```typescript
// useProfileLink.ts
const link = NostrLink.profile(pubkey, relays ? randomSample(relays, 3) : undefined)
```

## NostrLink.fromTag() for parsing notification context

When handling notifications, the context (what was reacted to, reposted, etc.) comes from tags:

```typescript
// getNotificationContext.tsx
case EventKind.ZapReceipt: {
  const aTag = ev.tags.find(a => a[0] === "a")
  if (aTag) return NostrLink.fromTag(aTag)
  const eTag = ev.tags.find(a => a[0] === "e")
  if (eTag) return NostrLink.fromTag(eTag)
  const pTag = ev.tags.find(a => a[0] === "p")
  if (pTag) return NostrLink.fromTag(pTag)
}
```

## Constructor for address links (naddr)

```typescript
// BadgesFeed.ts
const profileBadgesLink = new NostrLink(
  NostrPrefix.Address,
  "profile_badges",
  EventKind.ProfileBadges,
  pubkey,
)
const profileBadges = useEventFeed(profileBadgesLink)

// Parse all tags from the event into NostrLink objects
const links = NostrLink.fromTags(profileBadges?.tags ?? [])

// Filter by type and kind
const selectedBadges = links.filter(
  a => a.type === NostrPrefix.Address && a.kind === EventKind.Badge
)
```

## tryParseNostrLink for user input

```typescript
// useLoginHandler.tsx
const link = tryParseNostrLink(key, NostrPrefix.PublicKey)
if (!link) throw new Error("Invalid public key")
LoginStore.loginWithPubkey(link.id, LoginSessionType.PublicKey)
```

## NostrLink.fromEvent() + encode() for quote reposts

```typescript
// NoteCreator.tsx
const link = NostrLink.fromEvent(note.quote)
link.scope = LinkScope.Quote
note.note += `nostr:${link.encode(CONFIG.eventLinkPrefix)}`
const quoteTag = Nip18.linkToTag(link)
extraTags?.push(quoteTag)
```

## UnknownTag for custom list entries

```typescript
// media-settings.tsx
// Add a custom tag to a list
state.addToList(
  EventKind.BlossomServerList,
  [new UnknownTag(["server", new URL(newServer).toString()])],
  true,
)
// Check membership
list.some(b => b.equals(new UnknownTag(["server", k])))
```
