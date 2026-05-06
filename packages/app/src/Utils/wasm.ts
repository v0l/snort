import {
  EventExt,
  type FlatReqFilter,
  type NostrEvent,
  type Optimizer,
  type PowMiner,
  PowWorker,
  type ReqFilter,
  type TaggedNostrEvent,
} from "@snort/system"
import PowWorkerURL from "@snort/system/src/pow-worker.ts?worker&url"

import { unwrap } from "@/Utils/index"

import {
  compress,
  expand_filter,
  flat_merge,
  get_diff,
  pow,
  schnorr_verify_batch,
  schnorr_verify_event,
  default as wasmInit,
} from "../../../system-wasm/pkg/system_wasm"
import WasmPath from "../../../system-wasm/pkg/system_wasm_bg.wasm"

export const WasmOptimizer = {
  expandFilter: (f: ReqFilter) => {
    return expand_filter(f) as Array<FlatReqFilter>
  },
  getDiff: (prev: Array<ReqFilter>, next: Array<ReqFilter>) => {
    return get_diff(prev, next) as Array<FlatReqFilter>
  },
  flatMerge: (all: Array<FlatReqFilter>) => {
    return flat_merge(all) as Array<ReqFilter>
  },
  compress: (all: Array<ReqFilter>) => {
    return compress(all) as Array<ReqFilter>
  },
  schnorrVerify: ev => {
    if (EventExt.isVerified(ev)) return true
    const { relays, ...clean } = ev as TaggedNostrEvent
    const ok = schnorr_verify_event(clean) as boolean
    if (ok) EventExt.markVerified(ev)
    return ok
  },
  batchVerify: evs => {
    // Filter to only the events that need verification, preserving their index.
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
      // One JS→WASM call for all unverified events; returns Uint8Array (1=valid, 0=invalid).
      const raw = schnorr_verify_batch(
        unverified.map(u => u.ev),
      ) as Uint8Array
      for (let j = 0; j < unverified.length; j++) {
        const ok = raw[j] === 1
        results[unverified[j].idx] = ok
        if (ok) EventExt.markVerified(unverified[j].ev)
      }
    }
    return results
  },
} as Optimizer

export class WasmPowWorker implements PowMiner {
  minePow(ev: NostrEvent, target: number): Promise<NostrEvent> {
    const res = pow(ev, target)
    return Promise.resolve(res)
  }
}

export { wasmInit, WasmPath }
export const hasWasm =
  "WebAssembly" in globalThis && typeof localStorage !== "undefined" && localStorage.getItem("wasm") !== "off"
const DefaultPowWorker = hasWasm ? undefined : new PowWorker(PowWorkerURL)
export const GetPowWorker = () => (hasWasm ? new WasmPowWorker() : unwrap(DefaultPowWorker))
