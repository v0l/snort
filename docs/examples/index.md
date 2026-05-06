# Examples

Real-world usage patterns extracted from the Snort app (`packages/app/src/`). Each page shows how the Snort libraries are actually used in production, with code and file references.

## @snort/system-react

- [React Hooks](/examples/system-react) — `useUserProfile`, `useRequestBuilder`, `useRequestBuilderAdvanced`, `useEventFeed`, `useReactions`, `useEventReactions`, `useCached`, `SnortContext`, `useUserSearch`

## @snort/system

- [Event Builder & Publisher](/examples/events) — `EventBuilder` hooks, `EventPublisher` for different login types, NIP-98 auth, NIP-59 gift wraps, `EventExt` utilities
- [NostrLink](/examples/nostr-link) — Factory methods, `fromTag()`, `tryParseNostrLink()`, `encode()`, `UnknownTag` for custom lists
- [Query System](/examples/queries) — Zap feeds, timeline filtering, NIP-17 chat, `RangeSync`, `OutboxModel`
- [NIP Implementations](/examples/nips) — NIP-10 thread parsing, NIP-11 relay info, NIP-18 quotes, NIP-94 file metadata, `parseZap`, DVM jobs
- [User State](/examples/user-state) — Login session creation, rehydration, mute lists, app data, custom `ToNostrEventTag`
- [Signers](/examples/signers) — NIP-46 connect flow, custom `EventSigner` implementation, `KeyStorage` persistence
- [Text Parsing](/examples/text) — Cached transforms, NIP-94 imeta extraction and construction

## @snort/shared

- [Shared Utilities](/examples/shared) — `ExternalStore` patterns, TLV encoding, bech32 helpers, `LNURL`, work queues, `FeedCache`

## @snort/wallet

- [Wallet Integration](/examples/wallet) — `WalletStore` lifecycle, LNDHub connection, `Zapper` for zaps, capability checks

## @snort/worker-relay

- [Worker Relay](/examples/worker-relay) — Initialization, `forYouFeed()`, `setEventMetadata()`, `count()`, admin operations

## Zero-Build Examples

- [Preact + HTM + Unpkg](/examples/preact-htm-unkpkg) — Tiny single-file Nostr SPA with no build step
