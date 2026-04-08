import { TextEncoder, TextDecoder } from "node:util"
import { Crypto } from "@peculiar/webcrypto"

Object.assign(global, { TextDecoder, TextEncoder })
Object.assign(globalThis.window.crypto, new Crypto())
