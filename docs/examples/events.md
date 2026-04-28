# Event Builder & Publisher Examples

Real-world usage of `EventBuilder`, `EventPublisher`, and `EventExt` from the Snort app.

## Setting the global client tag

All events built via `EventBuilder` automatically include a client tag. Set this at app startup:

```typescript
// index.tsx
EventBuilder.ClientTag = [
  "client",
  CONFIG.appNameCapitalized,
  "31990:84de35e2584d2b144aae823c9ed0b0f3deda09648530b93d1a2a146d1dea9864:app-profile",
]
```

## EventBuilder as a callback parameter (EventBuilderHook)

The `note()` and `reply()` methods accept a hook function that receives the `EventBuilder` before signing. Use this to add extra tags, change the kind, etc.:

```typescript
// NoteCreator.tsx
const hk = (eb: EventBuilder) => {
  extraTags?.forEach(t => eb.tag(t))
  note.extraTags?.forEach(t => eb.tag(t))
  if (note.pollOptions) {
    eb.kind(EventKind.Polls)
  }
  return eb
}
const ev = note.replyTo
  ? await publisher.reply(note.replyTo, note.note, hk)
  : await publisher.note(note.note, hk)
```

## NIP-98 HTTP authentication with EventBuilder

Build and sign a kind 27235 HTTP auth event for API requests:

```typescript
// base.ts
const auth = await new EventBuilder()
  .kind(EventKind.HttpAuthentication)
  .tag(["url", `${this.url}${path}`])
  .tag(["method", method ?? "GET"])
  .buildAndSign(signer)

// Used as HTTP header:
// authorization: `Nostr ${window.btoa(JSON.stringify(auth))}`
```

## Creating publishers for different login types

```typescript
// Functions.ts
// Private key signer
case LoginSessionType.PrivateKey:
  return EventPublisher.privateKey(unwrap(l.privateKeyData as KeyStorage).value)

// NIP-46 remote signer with bunker:// URL
case LoginSessionType.Nip46: {
  const inner = new PrivateKeySigner(unwrap(l.privateKeyData as KeyStorage).value)
  const nip46 = new Nip46Signer(`bunker://${unwrap(l.publicKey)}?${[...relayArgs].join("&")}`, inner)
  nip46.on("oauth", url => window.open(url, CONFIG.appNameCapitalized, "width=600,height=800,popup=yes"))
  return new EventPublisher(nip46, unwrap(l.publicKey))
}

// NIP-07 browser extension signer
case LoginSessionType.Nip7:
  return new EventPublisher(new Nip7Signer(), unwrap(l.publicKey))
```

## NIP-59 gift wrap flow for chat

```typescript
// chat/nip17.ts
const gossip = pub.createUnsigned(EventKind.ChatRumor, msg, eb => {
  eb.tag(["p", ...participants])
})
const sealed = await pub.sealRumor(gossip, recipientPubkey)
const wrapped = await pub.giftWrap(sealed, recipientPubkey, powTarget)
```

## EventExt utilities for thread parsing and verification

```typescript
// ThreadContextWrapper.tsx
const parsedThread = primary ? EventExt.extractThread(primary) : undefined
const currentNote = unmuted.find(a => EventExt.keyOf(a) === currentId)

// wasm.ts
if (EventExt.isVerified(ev)) return true
EventExt.markVerified(ev)
EventExt.minePow(ev, target)
```

## mapEventToProfile for profile updates

```typescript
// Profile.tsx
const ev = await publisher.metadata(userCopy)
const newProfile = mapEventToProfile(ev)
if (newProfile) {
  await system.config.profiles.set(newProfile)
}
```
