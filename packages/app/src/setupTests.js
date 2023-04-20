// @ts-expect-error - we have a folder called util so TS gets confused
import { TextEncoder, TextDecoder } from "util";

Object.assign(global, { TextDecoder, TextEncoder });
