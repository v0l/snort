# @snort/system-wasm

WebAssembly-optimized implementations of critical Nostr operations.

## Installation

```bash
bun add @snort/system-wasm
```

## Overview

`@snort/system-wasm` provides WebAssembly implementations of the `Optimizer` interface, offering significant performance improvements over pure JavaScript for:

- Schnorr signature verification (batch and single)
- Proof-of-work mining
- Filter expansion, merging, and compression

## Optimizer Interface

Both the default JS optimizer and the WASM optimizer implement this interface:

```typescript
interface Optimizer {
  expandFilter(f: ReqFilter): Array<FlatReqFilter>
  getDiff(prev: Array<ReqFilter>, next: Array<ReqFilter>): Array<FlatReqFilter>
  flatMerge(all: Array<FlatReqFilter>): Array<ReqFilter>
  compress(all: Array<ReqFilter>): Array<ReqFilter>
  schnorrVerify(ev: NostrEvent): boolean
  batchVerify(evs: Array<NostrEvent>): Array<boolean>
}
```

## Usage with NostrSystem

`@snort/system-wasm` exports low-level WASM functions. You need to create an `Optimizer` implementation that wraps them:

```typescript
import { NostrSystem, EventExt, type Optimizer, type FlatReqFilter, type ReqFilter, type NostrEvent, type TaggedNostrEvent } from '@snort/system'
import { expand_filter, get_diff, flat_merge, compress, schnorr_verify_event, schnorr_verify_batch } from '@snort/system-wasm'

// Create the WasmOptimizer adapter
const WasmOptimizer: Optimizer = {
  expandFilter: (f: ReqFilter) => expand_filter(f) as Array<FlatReqFilter>,
  getDiff: (prev: Array<ReqFilter>, next: Array<ReqFilter>) => get_diff(prev, next) as Array<FlatReqFilter>,
  flatMerge: (all: Array<FlatReqFilter>) => flat_merge(all) as Array<ReqFilter>,
  compress: (all: Array<ReqFilter>) => compress(all) as Array<ReqFilter>,
  schnorrVerify: (ev: NostrEvent) => {
    if (EventExt.isVerified(ev)) return true
    const { relays, ...clean } = ev as TaggedNostrEvent
    const ok = schnorr_verify_event(clean) as boolean
    if (ok) EventExt.markVerified(ev)
    return ok
  },
  batchVerify: (evs: Array<NostrEvent>) => {
    const unverified: Array<{ idx: number; ev: NostrEvent }> = []
    const results = new Array<boolean>(evs.length)
    for (let i = 0; i < evs.length; i++) {
      if (EventExt.isVerified(evs[i])) {
        results[i] = true
      } else {
        unverified.push({ idx: i, ev: evs[i] })
      }
    }
    if (unverified.length > 0) {
      const raw = schnorr_verify_batch(unverified.map(u => u.ev)) as Uint8Array
      for (let j = 0; j < unverified.length; j++) {
        const ok = raw[j] === 1
        results[unverified[j].idx] = ok
        if (ok) EventExt.markVerified(unverified[j].ev)
      }
    }
    return results
  },
}

const System = new NostrSystem({
  optimizer: WasmOptimizer,
  checkSigs: true, // Enable signature verification to benefit from WASM
})
```

### WASM Initialization

The WASM module must be initialized before use. Import the init function and WASM binary:

```typescript
import wasmInit from '@snort/system-wasm'
import wasmPath from '@snort/system-wasm/pkg/system_wasm_bg.wasm'

// Initialize WASM (call once before using any WASM functions)
await wasmInit(wasmPath)
```

## DefaultOptimizer

When WASM is not available, the system falls back to `DefaultOptimizer` which uses pure JavaScript:

```typescript
import { DefaultOptimizer } from '@snort/system'

const System = new NostrSystem({
  optimizer: DefaultOptimizer,
})
```

## Performance

WASM operations are significantly faster than pure JavaScript for CPU-intensive tasks:

- **Batch signature verification**: ~5-10x faster with WASM
- **Proof-of-work mining**: ~3-5x faster with WASM
- **Filter compression**: ~2-3x faster with WASM

## See Also

- [@snort/system](/packages/system) - Core system
- [Query System](/packages/system/queries) - Filter handling
