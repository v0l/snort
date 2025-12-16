import { type FlatReqFilter, type NostrEvent, type Optimizer, type PowMiner, PowWorker, type ReqFilter } from "@snort/system";
import PowWorkerURL from "@snort/system/src/pow-worker.ts?worker&url";

import { unwrap } from "@/Utils/index";

import {
  compress,
  default as wasmInit,
  expand_filter,
  flat_merge,
  get_diff,
  pow,
  schnorr_verify_event,
} from "../../../system-wasm/pkg/system_wasm";
import WasmPath from "../../../system-wasm/pkg/system_wasm_bg.wasm";

export const WasmOptimizer = {
  expandFilter: (f: ReqFilter) => {
    return expand_filter(f) as Array<FlatReqFilter>;
  },
  getDiff: (prev: Array<ReqFilter>, next: Array<ReqFilter>) => {
    return get_diff(prev, next) as Array<FlatReqFilter>;
  },
  flatMerge: (all: Array<FlatReqFilter>) => {
    return flat_merge(all) as Array<ReqFilter>;
  },
  compress: (all: Array<ReqFilter>) => {
    return compress(all) as Array<ReqFilter>;
  },
  schnorrVerify: ev => {
    return schnorr_verify_event(ev);
  },
} as Optimizer;

export class WasmPowWorker implements PowMiner {
  minePow(ev: NostrEvent, target: number): Promise<NostrEvent> {
    const res = pow(ev, target);
    return Promise.resolve(res);
  }
}

export { wasmInit, WasmPath };
export const hasWasm = "WebAssembly" in globalThis && localStorage.getItem("wasm") !== "off";
const DefaultPowWorker = hasWasm ? undefined : new PowWorker(PowWorkerURL);
export const GetPowWorker = () => (hasWasm ? new WasmPowWorker() : unwrap(DefaultPowWorker));
