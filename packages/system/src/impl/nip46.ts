import { secp256k1 } from "@noble/curves/secp256k1.js"
import { bech32ToHex, unwrap } from "@snort/shared"
import debug from "debug"
import { EventEmitter } from "eventemitter3"
import { Connection } from "../connection"
import { Nip46RpcTimeout } from "../const"
import { EventBuilder } from "../event-builder"
import { EventExt } from "../event-ext"
import type EventKind from "../event-kind"
import type { NostrEvent } from "../nostr"
import { type EventSigner, PrivateKeySigner } from "../signer"

const NIP46_KIND = 24_133
// FIXME add all kinds that Snort signs
const PERMS =
  "nip04_encrypt,nip04_decrypt,sign_event:0,sign_event:1,sign_event:3,sign_event:4,sign_event:6,sign_event:7,sign_event:30078"

interface Nip46Request {
  id: string
  method: string
  params: Array<string>
}

interface Nip46Response {
  id: string
  result: string
  error: string
}

interface QueueObj {
  resolve: (o: Nip46Response) => void
  reject: (e: Error) => void
  authed?: boolean
}

interface Nip46Events {
  oauth: (url: string) => void
  ready: () => void
}

export class Nip46Signer extends EventEmitter<Nip46Events> implements EventSigner {
  #conn?: Connection
  #relay: string
  #localPubkey: string
  #remotePubkey?: string
  #token?: string
  #insideSigner: EventSigner
  #commandQueue: Map<string, QueueObj> = new Map()
  #log = debug("NIP-46")
  #proto: string
  #didInit: boolean = false

  /**
   * Start NIP-46 connection
   *
   * Connection formats:
   * - bunker://: bunker://<remote-signer-pubkey>?relay=<ws-url>&secret=<secret>
   *   (NIP-46 "Direct connection initiated by remote-signer")
   * - nostrconnect://: nostrconnect://<client-pubkey>?relay=<ws-url>&secret=<secret>&perms=<perms>
   *   (NIP-46 "Direct connection initiated by the client")
   *
   * Note: For nostrconnect:// flow, the `secret` parameter is REQUIRED per NIP-46 to prevent
   * connection spoofing. The client MUST validate the `secret` returned by the connect response.
   *
   * @param config bunker:// or nostrconnect:// URL
   * @param insideSigner Optional signer for encrypting/decrypting messages
   *
   * @see https://github.com/nostr-protocol/nips/blob/master/46.md#initiating-a-connection
   */
  constructor(config: string, insideSigner?: EventSigner) {
    super()
    const u = new URL(config)
    this.#proto = u.protocol
    this.#localPubkey = u.hostname || u.pathname.substring(2)

    if (u.hash.length > 1) {
      this.#token = u.hash.substring(1)
    } else {
      this.#token = u.searchParams.get("secret") || undefined
    }
    if (this.#localPubkey.startsWith("npub")) {
      this.#localPubkey = bech32ToHex(this.#localPubkey)
    }

    this.#relay = unwrap(u.searchParams.get("relay"))
    this.#insideSigner = insideSigner ?? new PrivateKeySigner(secp256k1.keygen().secretKey)

    // For bunker:// flow, the remote signer pubkey is in the URL
    // For nostrconnect:// flow, the remote signer pubkey is discovered from the connect response
    // See NIP-46: https://github.com/nostr-protocol/nips/blob/master/46.md#initiating-a-connection
    if (this.isBunker) {
      this.#remotePubkey = this.#localPubkey
    }
  }

  get supports(): string[] {
    return ["nip44"]
  }

  get relays() {
    return [this.#relay]
  }

  get privateKey(): string | undefined {
    if (this.#insideSigner instanceof PrivateKeySigner) {
      return this.#insideSigner.privateKey
    }
    return undefined
  }

  get isBunker() {
    return this.#proto === "bunker:"
  }

  /**
   * Connect to the remote signer relay and establish the NIP-46 connection.
   *
   * For bunker:// flow: sends connect request to the remote signer.
   * For nostrconnect:// flow: waits for the remote signer to send a connect response,
   * from which the remote signer's pubkey is discovered (per NIP-46 spec).
   *
   * @param autoConnect Automatically initiate the connect flow
   * @see https://github.com/nostr-protocol/nips/blob/master/46.md#initiating-a-connection
   */
  async init(autoConnect = true) {
    this.#localPubkey = await this.#insideSigner.getPubKey()
    return await new Promise<void>((resolve, reject) => {
      this.#conn = new Connection(this.#relay, { read: true, write: true })
      this.#conn.on("unverifiedEvent", (_sub, e) => {
        // Verify the Schnorr signature before processing the NIP-46 message to
        // prevent forged protocol messages from an attacker on a public relay.
        if (!EventExt.isValid(e)) {
          this.#log("Dropping NIP-46 event with invalid signature from %s", e.pubkey)
          return
        }
        this.#onReply(e).catch(err => this.#log("Error handling NIP-46 reply: %O", err))
      })
      this.#conn.on("connected", async () => {
        this.#conn?.request([
          "REQ",
          "reply",
          {
            kinds: [NIP46_KIND],
            "#p": [this.#localPubkey],
            // strfry doesn't always delete ephemeral events
            since: Math.floor(Date.now() / 1000 - 10),
          },
        ])

        this.emit("ready")

        if (autoConnect) {
          if (this.isBunker) {
            const rsp = await this.#connect(unwrap(this.#remotePubkey))
            if (rsp.result === "ack") {
              resolve()
            } else {
              reject(rsp.error)
            }
          } else {
            this.#commandQueue.set("connect", {
              reject,
              resolve: () => {
                resolve()
              },
            })
          }
        } else {
          resolve()
        }
      })
      this.#conn.connect()
      this.#didInit = true
    })
  }

  async close() {
    if (this.#conn) {
      await this.#disconnect()
      this.#conn.closeRequest("reply")
      this.#conn.close()
      this.#conn = undefined
      this.#didInit = false
    }
  }

  async describe() {
    const rsp = await this.#rpc("describe", [])
    return JSON.parse(rsp.result) as Array<string>
  }

  /**
   * Get the user's public key from the remote signer.
   * Per NIP-46 Overview step 5, client must call get_public_key after connect
   * to learn the user-pubkey (which may differ from remote-signer-pubkey).
   *
   * @see https://github.com/nostr-protocol/nips/blob/master/46.md#overview
   */
  async getPubKey() {
    if (!this.#remotePubkey) throw new Error("Remote pubkey not yet known; call init() first")
    const rsp = await this.#rpc("get_public_key", [])
    return rsp.result as string
  }

  async nip4Encrypt(content: string, otherKey: string) {
    const rsp = await this.#rpc("nip04_encrypt", [otherKey, content])
    return rsp.result as string
  }

  async nip4Decrypt(content: string, otherKey: string) {
    const rsp = await this.#rpc("nip04_decrypt", [otherKey, content])
    return rsp.result as string
  }

  nip44Encrypt(_content: string, _key: string): Promise<string> {
    throw new Error("Method not implemented.")
  }

  nip44Decrypt(_content: string, _otherKey: string): Promise<string> {
    throw new Error("Method not implemented.")
  }

  async sign(ev: NostrEvent) {
    const rsp = await this.#rpc("sign_event", [JSON.stringify(ev)])
    const signed = JSON.parse(rsp.result as string) as NostrEvent
    if (signed.id !== ev.id) {
      throw new Error(
        "Signer returned different event id! Please check your event format or contact the signer developer!",
      )
    }
    return {
      ...ev,
      sig: signed.sig,
    }
  }

  /**
   * NIP-46 oAuth bunker signup
   * @param name Desired name
   * @param domain Desired domain
   * @param email Backup email address
   * @returns
   */
  async createAccount(name: string, domain: string, email?: string) {
    await this.init(false)
    const rsp = await this.#rpc("create_account", [name, domain, email ?? "", PERMS])
    if (!rsp.error) {
      this.#remotePubkey = rsp.result as string
    }
  }

  async #disconnect() {
    return await this.#rpc("disconnect", [])
  }

  async #connect(pk: string) {
    const connectParams = [pk, this.#token ?? "", PERMS]
    return await this.#rpc("connect", connectParams)
  }

  /**
   * Handle incoming NIP-46 event from relay
   *
   * For nostrconnect:// flow, the remote signer's pubkey is discovered from the
   * first response event's author (e.pubkey), as per NIP-46:
   * "Client discovers remote-signer-pubkey from connect response author."
   *
   * @see https://github.com/nostr-protocol/nips/blob/master/46.md#initiating-a-connection
   */
  async #onReply(e: NostrEvent) {
    if (e.kind !== NIP46_KIND) {
      throw new Error("Unknown event kind")
    }

    const decryptedContent = await this.#insideSigner.nip44Decrypt(e.content, e.pubkey)
    let reply: Nip46Request | Nip46Response
    try {
      reply = JSON.parse(decryptedContent) as Nip46Request | Nip46Response
    } catch {
      this.#log("Dropping NIP-46 event with malformed JSON payload from %s", e.pubkey)
      return
    }

    let id = reply.id
    // Log only the id/method — never the decrypted params/result which may contain secrets.
    if ("method" in reply) {
      this.#log("Recv request id=%s method=%s", reply.id, reply.method)
    } else {
      this.#log("Recv response id=%s error=%s", reply.id, reply.error || "(none)")
    }
    if ("method" in reply && reply.method === "connect") {
      // For nostrconnect:// flow, the signer should send a connect RESPONSE (not request).
      // Per NIP-46: "Client discovers remote-signer-pubkey from connect response author."
      // We use e.pubkey (the cryptographically verified event author) as the signer's pubkey,
      // regardless of whether the signer sends a request or response. This ensures we always
      // trust the verified pubkey over potentially incorrect params.
      // See: https://github.com/nostr-protocol/nips/blob/master/46.md#initiating-a-connection
      if (!this.isBunker) {
        this.#remotePubkey = e.pubkey
      } else {
        this.#remotePubkey = reply.params[0]
      }
      await this.#sendCommand(
        {
          id: reply.id,
          result: "ack",
          error: "",
        },
        unwrap(this.#remotePubkey),
      )
      id = "connect"
    } else if (!this.#remotePubkey) {
      // nostrconnect:// flow: signer sends a response (not a connect request)
      // Discover remote signer pubkey from event author per NIP-46 spec
      this.#remotePubkey = e.pubkey
      await this.#sendCommand(
        {
          id: reply.id,
          result: "ack",
          error: "",
        },
        e.pubkey,
      )
      id = "connect"
    }
    const pending = this.#commandQueue.get(id)
    if (!pending) {
      this.#log("No pending command for id=%s, ignoring", id)
      return
    }

    if ("result" in reply && reply.result === "auth_url") {
      if (!pending.authed) this.emit("oauth", reply.error)
      pending.authed = true
    } else {
      const rx = reply as Nip46Response
      if (rx.error) {
        pending.reject(new Error(rx.error))
      } else {
        pending.resolve(rx)
      }
      this.#commandQueue.delete(reply.id)
    }
  }

  async #rpc(method: string, params: Array<string>) {
    if (!this.#didInit) {
      await this.init()
    }
    if (!this.#conn) throw new Error("Connection error")

    const payload = {
      id: crypto.randomUUID(),
      method,
      params,
    } as Nip46Request

    this.#sendCommand(payload, unwrap(this.#remotePubkey))
    return await new Promise<Nip46Response>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#commandQueue.delete(payload.id)
        reject(new Error(`NIP-46 RPC timed out after ${Nip46RpcTimeout}ms (method=${method})`))
      }, Nip46RpcTimeout)
      this.#commandQueue.set(payload.id, {
        resolve: async (o: Nip46Response) => {
          clearTimeout(timeout)
          resolve(o)
        },
        reject: (e: Error) => {
          clearTimeout(timeout)
          reject(e)
        },
      })
    })
  }

  async #sendCommand(payload: Nip46Request | Nip46Response, target: string) {
    if (!this.#conn) return

    const eb = new EventBuilder()
    eb.kind(NIP46_KIND as EventKind)
      .content(await this.#insideSigner.nip44Encrypt(JSON.stringify(payload), target))
      .tag(["p", target])

    // Log only the id/method — never the params which may contain secrets.
    if ("method" in payload) {
      this.#log("Send request id=%s method=%s", payload.id, payload.method)
    } else {
      this.#log("Send response id=%s", payload.id)
    }
    const evCommand = await eb.buildAndSign(this.#insideSigner)
    await this.#conn.publish(evCommand)
  }
}
