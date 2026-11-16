import type { ServerWebSocket } from "bun"
import { type Filter, matchFilters } from "nostr-tools/filter"
import { decrypt, encrypt, getConversationKey } from "nostr-tools/nip44"
import { type Event, finalizeEvent, generateSecretKey, getPublicKey, verifyEvent } from "nostr-tools/pure"

type SocketData = { subscriptions: Map<string, Filter[]> }
type Request = { id: string; method: string; params: string[]; client: string }

export class Nip46Fixture {
  readonly transportKey = generateSecretKey()
  readonly transportPubkey = getPublicKey(this.transportKey)
  identity = generateSecretKey()
  readonly authorised = new Set<string>()
  readonly requests: Request[] = []
  readonly sockets = new Set<ServerWebSocket<SocketData>>()
  readonly server
  silent = false
  changeEvent = false
  approvalUrl?: string
  readonly pendingApprovals: Request[] = []
  onApproval?: () => void
  #subscribers: Array<{ pubkey: string; resolve: () => void }> = []

  constructor(readonly options: { secret?: string } = {}) {
    this.server = Bun.serve<SocketData>({
      hostname: "127.0.0.1",
      port: 0,
      fetch: (request, server) => {
        if (server.upgrade(request, { data: { subscriptions: new Map() } })) return
        return new Response("WebSocket only", { status: 400 })
      },
      websocket: {
        open: socket => {
          this.sockets.add(socket)
        },
        close: socket => {
          this.sockets.delete(socket)
        },
        message: (socket, raw) => {
          this.receive(socket, String(raw))
        },
      },
    })
  }

  get pubkey() {
    return getPublicKey(this.identity)
  }
  get relayUrl() {
    return `ws://127.0.0.1:${this.server.port}`
  }
  get bunkerUri() {
    const params = new URLSearchParams({ relay: this.relayUrl })
    if (this.options.secret) params.set("secret", this.options.secret)
    return `bunker://${this.transportPubkey}?${params}`
  }

  waitForSubscription(pubkey: string) {
    const hasSubscription = () =>
      [...this.sockets].some(s =>
        [...s.data.subscriptions.values()].some(filters => filters.some(f => f["#p"]?.includes(pubkey))),
      )
    if (hasSubscription()) return Promise.resolve()
    return new Promise<void>(resolve => this.#subscribers.push({ pubkey, resolve }))
  }

  receive(socket: ServerWebSocket<SocketData>, raw: string) {
    const [type, id, ...rest] = JSON.parse(raw)
    if (type === "REQ") {
      socket.data.subscriptions.set(id, rest)
      socket.send(JSON.stringify(["EOSE", id]))
      this.#subscribers = this.#subscribers.filter(waiter => {
        if (rest.some((f: Filter) => f["#p"]?.includes(waiter.pubkey))) {
          waiter.resolve()
          return false
        }
        return true
      })
    } else if (type === "CLOSE") {
      socket.data.subscriptions.delete(id)
    } else if (type === "EVENT") {
      const event = id as Event
      if (!verifyEvent(event)) throw new Error("Invalid client event")
      socket.send(JSON.stringify(["OK", event.id, true, ""]))
      this.publish(event)
      if (event.kind !== 24133 || !event.tags.some(t => t[0] === "p" && t[1] === this.transportPubkey)) return
      const key = getConversationKey(this.transportKey, event.pubkey)
      const request: Request = { ...JSON.parse(decrypt(event.content, key)), client: event.pubkey }
      this.requests.push(request)
      if (request.params.some(p => typeof p !== "string")) throw new Error("NIP-46 params must be strings")
      if (this.silent) return
      if (this.approvalUrl) {
        this.pendingApprovals.push(request)
        this.respond(request.client, { id: request.id, result: "auth_url", error: this.approvalUrl })
        this.onApproval?.()
        return
      }
      try {
        this.respond(event.pubkey, { id: request.id, result: this.handle(request) })
      } catch (error) {
        this.respond(event.pubkey, { id: request.id, error: (error as Error).message })
      }
    }
  }

  handle(request: Request): string {
    const [first, second] = request.params
    if (request.method === "connect") {
      if (first !== this.transportPubkey || second !== (this.options.secret ?? ""))
        throw new Error("Connection rejected")
      this.authorised.add(request.client)
      return "ack"
    }
    if (!this.authorised.has(request.client)) throw new Error("Not authorised")
    switch (request.method) {
      case "get_public_key":
        return this.pubkey
      case "sign_event": {
        const template = JSON.parse(first)
        if (this.changeEvent) template.content = "changed by signer"
        return JSON.stringify(finalizeEvent(template, this.identity))
      }
      case "nip44_encrypt":
        return encrypt(second, getConversationKey(this.identity, first))
      case "nip44_decrypt":
        return decrypt(second, getConversationKey(this.identity, first))
      default:
        throw new Error("Unsupported method")
    }
  }

  approvePending() {
    for (const request of this.pendingApprovals.splice(0)) {
      this.respond(request.client, { id: request.id, result: this.handle(request) })
    }
  }

  respond(client: string, response: object, recipient = client) {
    const content = encrypt(JSON.stringify(response), getConversationKey(this.transportKey, client))
    this.publish(
      finalizeEvent(
        { kind: 24133, created_at: Math.floor(Date.now() / 1000), tags: [["p", recipient]], content },
        this.transportKey,
      ),
    )
  }

  acceptPairing(uri: string, options: { secret?: string; recipient?: string; authorise?: boolean } = {}) {
    const parsed = new URL(uri)
    if (options.authorise !== false) this.authorised.add(parsed.hostname)
    this.respond(
      parsed.hostname,
      { id: crypto.randomUUID(), result: options.secret ?? parsed.searchParams.get("secret") },
      options.recipient,
    )
  }

  publish(event: Event) {
    for (const socket of this.sockets) {
      for (const [id, filters] of socket.data.subscriptions) {
        if (matchFilters(filters, event)) socket.send(JSON.stringify(["EVENT", id, event]))
      }
    }
  }

  [Symbol.dispose]() {
    void this.server.stop(true)
  }
}
