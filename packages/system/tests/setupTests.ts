import { TextEncoder, TextDecoder } from "util";
import { Crypto } from "@peculiar/webcrypto";

Object.assign(global, { TextDecoder, TextEncoder });
Object.assign(globalThis.window.crypto, new Crypto());