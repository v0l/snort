# `@snort/system` — Comprehensive Audit & Review

**Package**: `@snort/system` v2.0.0-pre.8
**Date**: 2026-03-03
**Scope**: 75 source files, ~9,880 lines of TypeScript across 8 subdirectories
**Tests**: 149 tests, 338 assertions, 13 test files (~2,718 lines) — all passing, build clean

---

## 1. Architecture Overview

`@snort/system` is a full-featured Nostr client library implementing a layered architecture:

| Layer | Components | Responsibility |
|-------|-----------|----------------|
| **Transport** | `Connection`, `ConnectionPool` | WebSocket management, multiplexing |
| **Protocol** | `event-kind.ts`, `nostr.ts`, `impl/nip*.ts` | Nostr types + 14 NIP implementations |
| **Query Engine** | `RequestBuilder` → `QueryManager` → `Query` | Request lifecycle, trace-per-relay |
| **Optimization** | `query-optimizer/` (expand, merge, diff, compress) | Filter algebra |
| **Sync** | `SafeSync`, `DiffSyncTags`, `JsonEventSync`, `RangeSync`, `Negentropy` | State reconciliation |
| **Caching** | `BackgroundLoader`, profile/relay/follows caches, `CacheRelay` | Background data loading |
| **Signing** | `EventSigner`, `PrivateKeySigner`, NIP-07/46/55 signers | Pluggable signing |
| **Encryption** | NIP-04 (AES-CBC), NIP-44 v1/v2 (ChaCha20+HMAC), PIN storage | Message encryption |
| **State** | `UserState`, `NoteCollection` | User state management, event collections |
| **Content** | `transformText` pipeline | Rich text fragment extraction |

The design is sound. The `SystemInterface` abstraction cleanly separates concerns, the `RequestRouter` interface enables the outbox model as a pluggable strategy, and the signer interface allows transparent switching between local keys, browser extensions, and remote bunkers.

**Strengths of the architecture:**
- Clean separation between transport, protocol, and application layers
- Pluggable interfaces for signing, routing, caching, and optimization
- The negentropy set reconciliation protocol is a sophisticated addition
- `SafeSync` with `previous` tag chaining is a thoughtful approach to safe replaceable event updates
- `UserState` provides a coherent high-level API for managing complex user data
- The query trace system provides good observability (Perfetto-compatible export)

---

## 2. Security Findings

### CRITICAL

**2.1 — PIN Encryption Uses MAC-then-Encrypt (Wrong Order)**
`src/encryption/pin-encrypted.ts:64-93`

The MAC is computed over the plaintext, then the plaintext is encrypted with XChaCha20. On decrypt, the ciphertext is decrypted first, then the MAC is verified. This is the reverse of the recommended encrypt-then-MAC pattern. With a stream cipher like XChaCha20, an attacker can perform trivial bit-flipping attacks on the ciphertext, and the tampered plaintext will be decrypted and processed before the MAC check detects it.

Additionally, the MAC comparison at line 71 uses `!==` (non-constant-time string comparison), which is vulnerable to timing attacks.

**2.2 — Delegation Tags Accepted Without Signature Verification**
`src/event-ext.ts:40-45`

`getRootPubKey()` accepts NIP-26 delegation tags without verifying the delegation signature. There is a literal `// todo: verify sig` comment. Any event can claim delegation from any pubkey.

**2.3 — NIP-46 Processes Unverified Events**
`src/impl/nip46.ts:114`

The remote signer listens on `unverifiedEvent`, which only checks `EventExt.isValid()` — a method that merely confirms `sig !== undefined` without actually verifying the Schnorr signature. An attacker who can inject events into the relay (trivial on public relays) could potentially forge NIP-46 protocol messages.

### HIGH

| # | Finding | Location |
|---|---------|----------|
| 2.4 | `isValid()` does not verify signatures despite its name — only checks `sig !== undefined` | `event-ext.ts:163-169` |
| 2.5 | NIP-46 debug logging exposes decrypted payloads including connect secrets | `nip46.ts:240,303` |
| 2.6 | NIP-46 `#rpc()` fire-and-forgets `#sendCommand` (not awaited), no timeout on response promise | `nip46.ts:284-292` |
| 2.7 | Same scrypt-derived key used for both XChaCha20 encryption and HMAC — violates key separation | `pin-encrypted.ts:65-70` |
| 2.8 | `NotEncrypted` stores private keys as plaintext JSON (no PIN users) | `pin-encrypted.ts:97-122` |
| 2.9 | `PrivateKeySigner` exposes raw private key via public getter | `signer.ts:56-58` |
| 2.10 | NIP-44 v1 decrypt has no authentication — accepts any ciphertext silently | `encryption/nip44.ts:127-130` |

### Positive Security Notes
- NIP-44 v2 encrypt-then-MAC is implemented correctly
- MAC verification in NIP-44 uses constant-time `equalBytes()`
- Nonce generation uses CSPRNG (`randomBytes`)
- HKDF key derivation with proper domain separation (`"nip44-v2"`)
- scrypt parameters (N=2^20, r=8, p=1) are strong for passwords (but insufficient for short PINs)

---

## 3. Reliability & Error Handling Findings

### Hanging Promises (No Timeout, No Reject Path)

These are the most operationally dangerous issues — they cause the UI to freeze with no error feedback:

| Location | Scenario |
|----------|----------|
| `connection.ts:444` | Auth promise hangs if no auth handler is registered |
| `nip46.ts:285` | RPC promise hangs if remote signer goes offline |
| `nip55.ts:68` | Clipboard poll hangs forever (interval also leaks) |
| `query-manager.ts:150` | `fetch()` hangs if query never emits EOSE |
| `query-manager.ts:434` | Range sync fetcher hangs if connection drops mid-sync |

### Unprotected JSON.parse

11 of 14 `JSON.parse` calls lack try/catch. The most dangerous:

| Location | Impact |
|----------|--------|
| `connection.ts:194` | A single malformed relay message crashes the entire connection message handler |
| `nip46.ts:195,237` | Malformed bunker responses crash the signer |
| `event-publisher.ts:329,359` | Gift wrap/seal decryption of non-JSON content crashes |
| `sync/diff-sync.ts:60` | Corrupted encrypted tag data crashes sync |
| `relays.ts:26` | Malformed kind 3 content crashes relay parsing |

### Unhandled Async Errors

| Location | Issue |
|----------|-------|
| `nostr-system.ts:53` | `pool.on("event", async ...)` — cache relay errors become unhandled rejections |
| `nip46.ts:114` | `on("unverifiedEvent", async ...)` — JSON parse failures become unhandled rejections |
| `event-publisher.ts` | Zero try/catch blocks in entire file (24 async methods) |

---

## 4. Performance Findings

### CRITICAL

**4.1 — Cartesian Product Explosion in Filter Expansion**
`src/query-optimizer/request-expander.ts:8-47`

`expandFilter()` computes the full cartesian product of array fields. A filter with `{authors: [100], kinds: [5], "#p": [10]}` produces 5,000 `FlatReqFilter` objects. Real-world filters can have hundreds of authors. The downstream `diffFilters` (O(n^2)) and `mergeSimilar` (O(n^2) to O(n^3)) compound this into pathological performance.

### HIGH

| # | Finding | Location |
|---|---------|----------|
| 4.2 | `NoteCollection.takeSnapshot()` copies all events on every addition — O(n^2) total GC pressure | `note-collection.ts:48,104` |
| 4.3 | `BackgroundLoader.#blacklist` grows without bound, permanently blocks keys from loading | `background-loader.ts:9,119` |
| 4.4 | `BackgroundLoader` polling loop has no stop/destroy mechanism — runs forever | `background-loader.ts:104-128` |
| 4.5 | `QueryManager` cleanup interval never cleared, no destroy method | `query-manager.ts:60` |
| 4.6 | Event listeners in `#syncRangeSync` never cleaned up — accumulate proportionally | `query-manager.ts:437-448` |
| 4.7 | `Query.#tracing` map never pruned — grows on every reconnection for leave-open queries | `query.ts:157` |
| 4.8 | `ConnectTimeout` doubles on every disconnect, never resets on reconnect success | `connection.ts:179` |

### MEDIUM

- Connection pool event listeners never removed on disconnect (`connection-pool.ts:187-198`)
- `#connectionListeners` set leaks stale UUIDs after reconnections (`query-manager.ts:51,67,82`)
- Ephemeral check interval not cleared on `close()` (`connection.ts:477-498`)
- Busy-wait polling loop (100ms intervals) instead of event-based connection waiting (`connection-pool.ts:160-176`)
- `#pendingTraces` array has no timeout or eviction (`query-manager.ts:41`)
- `OutboxModel.forFlatRequest` mutates input filter objects (`outbox-model.ts:151-153`)

---

## 5. Type Safety Findings

| Severity | Finding | Location |
|----------|---------|----------|
| HIGH | `as unknown as T` double cast bypasses type system entirely | `connection-pool.ts:138` |
| HIGH | Non-null assertions on potentially undefined sync values + unprotected JSON.parse | `json-in-event-sync.ts:58,60` |
| MEDIUM | `PinEncrypted.fromPayload` force-casts without runtime validation | `pin-encrypted.ts:37` |
| MEDIUM | NIP-46 request/response types use `any` for params and results | `nip46.ts:28,33,272` |
| MEDIUM | `simpleMerge` accumulator typed as `any`, cast to `ReqFilter` | `request-merger.ts:37,109` |

---

## 6. Test Coverage Assessment

**Quantitative**: 13 test files / 75 source files = **17% file coverage**. 2,718 test LOC / 9,880 source LOC = **27% line ratio**.

**What is well tested:**
- NIP-10 thread parsing and reply construction (582 lines, thorough edge cases)
- Text/content parsing (677 lines, comprehensive fragment types)
- EventExt utilities (559 lines, good coverage of types/keys/signing/validation)
- Filter expansion, merging, diffing (326 lines combined)
- NostrLink encoding/decoding (201 lines)
- NIP-18 quote tags (159 lines)

**What has no tests at all:**

| Module | Lines | Risk |
|--------|-------|------|
| `connection.ts` | 499 | HIGH — WebSocket handling, reconnection, auth flow |
| `connection-pool.ts` | 286 | HIGH — pool lifecycle, broadcast logic |
| `query-manager.ts` | 534 | HIGH — central orchestrator, sync pipeline |
| `query.ts` | 411 | HIGH — query state machine, progress tracking |
| `nostr-system.ts` | 203 | MEDIUM — system initialization, social graph |
| `event-publisher.ts` | 361 | MEDIUM — all event creation methods |
| `user-state.ts` | 557 | MEDIUM — user state management |
| `encryption/nip44.ts` | 145 | HIGH — cryptographic correctness |
| `encryption/pin-encrypted.ts` | 129 | HIGH — key protection |
| `impl/nip46.ts` | 307 | HIGH — remote signer protocol |
| `sync/*.ts` | ~558 | MEDIUM — all sync strategies |
| `negentropy/*.ts` | ~628 | MEDIUM — set reconciliation |
| `background-loader.ts` | 145 | MEDIUM — polling lifecycle |
| `outbox/outbox-model.ts` | 224 | MEDIUM — relay routing logic |

The `negentropy.test.ts` file is a stub (empty test body, 6 lines).

**Key gap**: The most complex and error-prone modules (connection management, query orchestration, encryption, sync) have zero unit tests. The tested modules are primarily pure functions and data transformations — important but not where the bugs live.

---

## 7. Code Quality Observations

**Good practices observed:**
- TypeScript strict mode enabled
- ECMAScript private fields (`#field`) used consistently
- Fluent builder APIs (`RequestBuilder`, `EventBuilder`, `DVMJobRequest`)
- Event-driven architecture with typed EventEmitter
- LRU caching for expensive operations (NIP-11, NIP-57, threads)
- Proper NIP-19 TLV encoding/decoding
- `SortedMap` for efficient ordered collections
- Content processing pipeline is clean and extensible

**Areas for improvement:**
- No `dispose()`/`destroy()` lifecycle methods on any class — timers, intervals, and listeners leak when instances are discarded
- Magic numbers scattered throughout (timeouts, intervals, buffer sizes) — should be named constants
- `event-publisher.ts` has 24 async methods with zero error handling
- Mixed mutation patterns — some methods return new objects, others mutate in-place (`EventExt.sign`, `OutboxModel.forFlatRequest`)
- The `isValid` name is misleading — it performs structural validation, not cryptographic verification

---

## 8. Dependency Assessment

| Dependency | Purpose | Assessment |
|------------|---------|------------|
| `@noble/curves`, `@noble/hashes`, `@noble/ciphers` | Crypto primitives | Excellent — audited, pure JS, maintained |
| `@scure/base` | Encoding | Excellent — same family as noble |
| `@stablelib/xchacha20` | XChaCha20 for PIN encryption | Good, but redundant — noble/ciphers has xchacha20 |
| `eventemitter3` | Event emitting | Good — lightweight, well-maintained |
| `isomorphic-ws` + `ws` | WebSocket | Necessary for Node compatibility |
| `nostr-social-graph` | Social graph | External dependency for follow graph; version pinned |
| `typescript-lru-cache` | LRU cache | Fine, though a simpler `Map`-based cache would reduce dependencies |
| `uuid` | UUID generation | Heavy for generating random IDs — `crypto.randomUUID()` is native |
| `debug` | Logging | Appropriate for library logging |

**Note**: The `@stablelib/xchacha20` dependency is only used in `pin-encrypted.ts`. Since `@noble/ciphers` (already a dependency) provides `xchacha20`, this dependency could be consolidated.

---

## 9. Summary & Recommendations

### Priority 1 — Security (fix before release)

1. **Reverse MAC order in PIN encryption** — change to encrypt-then-MAC, use constant-time comparison, derive separate keys for encryption and MAC
2. **Verify delegation signatures** or remove `getRootPubKey` delegation support entirely
3. **Verify Schnorr signatures** on NIP-46 incoming events before processing
4. **Rename `isValid` to `isWellFormed`** and create a real `isValid` that includes signature verification

### Priority 2 — Reliability (fix soon)

5. **Add timeouts to all promises** — auth, NIP-46 RPC, fetch EOSE, range sync, NIP-55 clipboard
6. **Wrap all `JSON.parse` calls** in try/catch, especially `connection.ts:194`
7. **Add `.catch()` to all async event handlers** or use synchronous wrappers
8. **Add error handling to `event-publisher.ts`** — at minimum, wrap `JSON.parse` of decrypted content

### Priority 3 — Performance (fix for scale)

9. **Add lifecycle management** — `destroy()` methods on `QueryManager`, `BackgroundLoader`, `Connection`, `Query` that clear timers and listeners
10. **Add eviction/TTL to `BackgroundLoader.#blacklist`** — keys should be retryable after a cooldown
11. **Reset `ConnectTimeout` on successful reconnection**
12. **Optimize `NoteCollection.takeSnapshot()`** — consider incremental snapshots or lazy evaluation
13. **Add batching/chunking to `BackgroundLoader`** fetch requests to avoid oversized filters
14. **Address cartesian explosion** in filter expansion — consider operating on compressed filters where possible

### Priority 4 — Testing

15. **Add unit tests for `connection.ts`** — reconnection, auth flow, message parsing errors
16. **Add unit tests for encryption** — NIP-44 round-trip, PIN encrypt/decrypt, edge cases
17. **Add unit tests for `query-manager.ts`** — send pipeline, cache relay interaction, cleanup
18. **Add integration tests for NIP-46** — mock bunker communication, error scenarios
19. **Fill in the negentropy test stub**

### Priority 5 — Code Quality

20. **Extract magic numbers to named constants** in `const.ts`
21. **Remove redundant `@stablelib/xchacha20` dependency** — use `@noble/ciphers` instead
22. **Consider replacing `uuid` with native `crypto.randomUUID()`**
23. **Make mutation vs. immutability consistent** — `EventExt.sign` should either return a new event or be clearly documented as mutating

---

**Overall assessment**: The architecture is well-designed and the core Nostr protocol implementation is solid. The main concerns are (1) the MAC-then-encrypt pattern in PIN encryption, (2) missing signature verification in several trust-sensitive paths, (3) pervasive lack of error handling that could cause hanging UI or silent failures, and (4) missing lifecycle management causing memory/timer leaks in long-running sessions. The test coverage is thin relative to the complexity of the untested modules. The package is usable for its current purpose but needs hardening before wider library adoption.
