# @snort/wallet

Lightning Network wallet integration supporting LNDHub, NWC, Alby, and WebLN.

## Installation

```bash
bun add @snort/wallet
```

## Overview

`@snort/wallet` provides a unified `LNWallet` interface for multiple wallet backends, plus a `Zapper` class for sending NIP-57 zaps.

## LNWallet Interface

All wallets implement this interface:

```typescript
interface LNWallet extends EventEmitter<WalletEvents> {
  isReady(): boolean
  getInfo(): Promise<WalletInfo>
  login(password?: string): Promise<boolean>
  close(): Promise<boolean>
  getBalance(): Promise<Sats>
  createInvoice(req: InvoiceRequest): Promise<WalletInvoice>
  payInvoice(pr: string): Promise<WalletInvoice>
  getInvoices(): Promise<WalletInvoice[]>

  canAutoLogin(): boolean
  canGetInvoices(): boolean
  canGetBalance(): boolean
  canCreateInvoice(): boolean
  canPayInvoice(): boolean
}
```

## Wallet Types

### WalletKind

```typescript
enum WalletKind {
  LNDHub = 1,
  WebLN = 3,
  NWC = 4,
  Alby = 6,
}
```

### Loading a Wallet

```typescript
import { loadWallet, WalletKind } from '@snort/wallet'

const wallet = await loadWallet(WalletKind.NWC, configString)
await wallet.login()
const balance = await wallet.getBalance()
```

## WebLN

Browser extension wallet (e.g. Alby, Joule).

```typescript
import { WebLNWallet } from '@snort/wallet'

const wallet = new WebLNWallet()
if (wallet.isReady()) {
  const balance = await wallet.getBalance()
  const invoice = await wallet.createInvoice({ amount: 1000, memo: 'Test' })
}
```

No configuration needed — uses `window.webln` from the browser extension.

## LNDHub

LNDHub-compatible wallets (e.g. BlueWallet).

```typescript
import { LNDHubWallet } from '@snort/wallet'

const wallet = new LNDHubWallet('https://lndhub.example.com')
await wallet.login('password')
const balance = await wallet.getBalance()
```

## NostrWalletConnect (NWC)

NIP-47 wallet connect via Nostr relay communication.

```typescript
import { NostrConnectWallet } from '@snort/wallet'

// Config format: bunker:// or connection URI
const wallet = new NostrConnectWallet(configString)
await wallet.login()
const balance = await wallet.getBalance()
```

## Alby

Alby wallet via OAuth.

```typescript
import { AlbyWallet } from '@snort/wallet'

const wallet = new AlbyWallet({
  authUrl: 'https://getalby.com/oauth',
  // ... OAuth config
})
```

## Invoice Operations

### Creating Invoices

```typescript
const invoice = await wallet.createInvoice({
  amount: 1000,      // sats
  memo: 'Payment',   // optional
  expiry: 3600,      // optional, seconds
})

console.log(invoice.pr)          // bolt11 invoice string
console.log(invoice.paymentHash) // payment hash
```

### Paying Invoices

```typescript
const result = await wallet.payInvoice('lnbc1000...')

console.log(result.state)    // WalletInvoiceState.Paid
console.log(result.preimage) // payment preimage
console.log(result.fees)     // routing fees
```

### Checking Invoices

```typescript
const invoices = await wallet.getInvoices()

for (const inv of invoices) {
  console.log(inv.direction)  // "in" | "out"
  console.log(inv.state)      // WalletInvoiceState
  console.log(inv.amount)     // millisats
}
```

## Types

### InvoiceRequest

```typescript
interface InvoiceRequest {
  amount: Sats
  memo?: string
  expiry?: number
}
```

### WalletInvoice

```typescript
interface WalletInvoice {
  pr: string
  paymentHash: string
  memo: string
  amount: MilliSats
  fees: number
  timestamp: number
  preimage?: string
  state: WalletInvoiceState
  direction: "in" | "out"
}
```

### WalletInvoiceState

```typescript
enum WalletInvoiceState {
  Pending = 0,
  Paid = 1,
  Expired = 2,
  Failed = 3,
}
```

### WalletInfo

```typescript
interface WalletInfo {
  fee: number
  nodePubKey: string
  alias: string
  pendingChannels: number
  activeChannels: number
  peers: number
  blockHeight: number
  blockHash: string
  synced: boolean
  chains: string[]
  version: string
}
```

### WalletErrorCode

```typescript
enum WalletErrorCode {
  BadAuth = 1,
  NotEnoughBalance = 2,
  BadPartner = 3,
  InvalidInvoice = 4,
  RouteNotFound = 5,
  GeneralError = 6,
  NodeFailure = 7,
}
```

## Zapper

High-level zap sending with NIP-57 support.

### Constructor

```typescript
import { Zapper } from '@snort/wallet'

const zapper = new Zapper(
  system,          // SystemInterface
  publisher,       // EventPublisher (optional, for signed zaps)
  (result) => {    // onResult callback (optional)
    console.log('Zap result:', result)
  }
)
```

### `Zapper.fromEvent(ev: NostrEvent): ZapTarget[]`

Extract zap targets from an event's `zap` tags.

### `zapper.send(wallet, targets, amount): Promise<ZapTargetResult[]>`

Send zaps to multiple targets, splitting amount by weight.

```typescript
const targets = Zapper.fromEvent(event)
const results = await zapper.send(wallet, targets, 1000) // 1000 sats total

for (const r of results) {
  console.log(r.target, r.paid, r.sent, r.fee, r.pr, r.error)
}
```

### `zapper.load(targets): Promise<void>`

Preload LNURL services for targets.

### `zapper.canZap(): boolean`

Whether any loaded target supports NIP-57 zaps.

### `zapper.minAmount(): number`

Minimum sendable amount across all targets.

### `zapper.maxAmount(): number`

Maximum sendable amount across all targets.

### `zapper.maxComment(): number`

Maximum comment length allowed.

## ZapTarget

```typescript
interface ZapTarget {
  type: "lnurl" | "pubkey"
  value: string
  weight: number
  memo?: string
  name?: string
  zap?: {
    pubkey: string
    anon: boolean
    event?: NostrLink
  }
}
```

## ZapTargetResult

```typescript
interface ZapTargetResult {
  target: ZapTarget
  paid: boolean
  sent: number
  fee: number
  pr: string
  error?: Error
}
```

## Helper Functions

### `prToWalletInvoice(pr: string): WalletInvoice | undefined`

Parse a bolt11 invoice string into a `WalletInvoice` object.

```typescript
import { prToWalletInvoice } from '@snort/wallet'

const invoice = prToWalletInvoice('lnbc1000...')
console.log(invoice?.amount, invoice?.state)
```

## See Also

- [Examples → Wallet Integration](/examples/wallet)
