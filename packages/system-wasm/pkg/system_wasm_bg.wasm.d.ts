/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const diff_filters: (a: any, b: any) => [number, number, number];
export const expand_filter: (a: any) => [number, number, number];
export const get_diff: (a: any, b: any) => [number, number, number];
export const flat_merge: (a: any) => [number, number, number];
export const compress: (a: any) => [number, number, number];
export const pow: (a: any, b: any) => [number, number, number];
export const schnorr_verify: (a: any, b: any, c: any) => [number, number, number];
export const schnorr_verify_event: (a: any) => [number, number, number];
export const rustsecp256k1_v0_10_0_context_create: (a: number) => number;
export const rustsecp256k1_v0_10_0_context_destroy: (a: number) => void;
export const rustsecp256k1_v0_10_0_default_illegal_callback_fn: (a: number, b: number) => void;
export const rustsecp256k1_v0_10_0_default_error_callback_fn: (a: number, b: number) => void;
export const __wbindgen_exn_store: (a: number) => void;
export const __externref_table_alloc: () => number;
export const __wbindgen_export_2: WebAssembly.Table;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
export const __externref_table_dealloc: (a: number) => void;
export const __wbindgen_start: () => void;
