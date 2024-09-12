/* tslint:disable */
/* eslint-disable */
/**
 * @param {any} prev
 * @param {any} next
 * @returns {any}
 */
export function diff_filters(prev: any, next: any): any;
/**
 * @param {any} val
 * @returns {any}
 */
export function expand_filter(val: any): any;
/**
 * @param {any} prev
 * @param {any} next
 * @returns {any}
 */
export function get_diff(prev: any, next: any): any;
/**
 * @param {any} val
 * @returns {any}
 */
export function flat_merge(val: any): any;
/**
 * @param {any} val
 * @returns {any}
 */
export function compress(val: any): any;
/**
 * @param {any} val
 * @param {any} target
 * @returns {any}
 */
export function pow(val: any, target: any): any;
/**
 * @param {any} hash
 * @param {any} sig
 * @param {any} pub_key
 * @returns {boolean}
 */
export function schnorr_verify(hash: any, sig: any, pub_key: any): boolean;
/**
 * @param {any} event
 * @returns {boolean}
 */
export function schnorr_verify_event(event: any): boolean;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly diff_filters: (a: number, b: number, c: number) => void;
  readonly expand_filter: (a: number, b: number) => void;
  readonly get_diff: (a: number, b: number, c: number) => void;
  readonly flat_merge: (a: number, b: number) => void;
  readonly compress: (a: number, b: number) => void;
  readonly pow: (a: number, b: number, c: number) => void;
  readonly schnorr_verify: (a: number, b: number, c: number, d: number) => void;
  readonly schnorr_verify_event: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_10_0_context_create: (a: number) => number;
  readonly rustsecp256k1_v0_10_0_context_destroy: (a: number) => void;
  readonly rustsecp256k1_v0_10_0_default_illegal_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_10_0_default_error_callback_fn: (a: number, b: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
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
