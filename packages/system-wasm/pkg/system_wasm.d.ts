/* tslint:disable */
/* eslint-disable */
export function diff_filters(prev: any, next: any): any;
export function expand_filter(val: any): any;
export function get_diff(prev: any, next: any): any;
export function flat_merge(val: any): any;
export function compress(val: any): any;
export function pow(val: any, target: any): any;
export function schnorr_verify(hash: any, sig: any, pub_key: any): boolean;
export function schnorr_verify_event(event: any): boolean;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly diff_filters: (a: any, b: any) => [number, number, number];
  readonly expand_filter: (a: any) => [number, number, number];
  readonly get_diff: (a: any, b: any) => [number, number, number];
  readonly flat_merge: (a: any) => [number, number, number];
  readonly compress: (a: any) => [number, number, number];
  readonly pow: (a: any, b: any) => [number, number, number];
  readonly schnorr_verify: (a: any, b: any, c: any) => [number, number, number];
  readonly schnorr_verify_event: (a: any) => [number, number, number];
  readonly rustsecp256k1_v0_10_0_context_create: (a: number) => number;
  readonly rustsecp256k1_v0_10_0_context_destroy: (a: number) => void;
  readonly rustsecp256k1_v0_10_0_default_illegal_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_10_0_default_error_callback_fn: (a: number, b: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
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
export default function __wbg_init(
  module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>,
): Promise<InitOutput>;
