/* tslint:disable */
/* eslint-disable */

export function compress(val: any): any;

export function diff_filters(prev: any, next: any): any;

export function expand_filter(val: any): any;

export function flat_merge(val: any): any;

export function get_diff(prev: any, next: any): any;

export function pow(val: any, target: any): any;

/**
 * Verify a raw Schnorr signature given the message hash, signature, and
 * x-only public key — all as hex strings.
 *
 * Returns a `JsValue` error (rather than panicking) if any hex value is
 * malformed or the wrong length.
 */
export function schnorr_verify(hash: any, sig: any, pub_key: any): boolean;

/**
 * Verify a batch of Nostr events in a single JS→WASM call.
 *
 * This is the primary performance optimisation for bulk verification.
 * Crossing the JS/WASM boundary has fixed overhead (serialisation, memory
 * copies); calling `schnorr_verify_event` N times pays that cost N times.
 * `schnorr_verify_batch` pays it once regardless of N, then runs the
 * cryptographic work entirely inside WASM.
 *
 * Returns a `Uint8Array` (one byte per event: `1` = valid, `0` = invalid)
 * rather than `Array<boolean>` — typed arrays cross the WASM boundary
 * without per-element boxing overhead.
 *
 * Call-site example (TypeScript):
 * ```ts
 * const results = schnorr_verify_batch(events)  // Uint8Array
 * const valid = Array.from(results).map(b => b === 1)
 * ```
 */
export function schnorr_verify_batch(events: any): Uint8Array;

/**
 * Verify a single Nostr event.
 *
 * Computes the canonical event ID from scratch (does not trust `event.id`)
 * then checks the Schnorr signature.  Returns `false` for any malformed
 * field rather than throwing — preserving existing call-site behaviour.
 */
export function schnorr_verify_event(event: any): boolean;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly compress: (a: any) => [number, number, number];
    readonly diff_filters: (a: any, b: any) => [number, number, number];
    readonly expand_filter: (a: any) => [number, number, number];
    readonly flat_merge: (a: any) => [number, number, number];
    readonly get_diff: (a: any, b: any) => [number, number, number];
    readonly pow: (a: any, b: any) => [number, number, number];
    readonly schnorr_verify: (a: any, b: any, c: any) => [number, number, number];
    readonly schnorr_verify_batch: (a: any) => [number, number, number, number];
    readonly schnorr_verify_event: (a: any) => [number, number, number];
    readonly rustsecp256k1_v0_10_0_context_create: (a: number) => number;
    readonly rustsecp256k1_v0_10_0_context_destroy: (a: number) => void;
    readonly rustsecp256k1_v0_10_0_default_error_callback_fn: (a: number, b: number) => void;
    readonly rustsecp256k1_v0_10_0_default_illegal_callback_fn: (a: number, b: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
