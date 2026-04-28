# @snort/wallet Examples

Real-world usage of `LNWallet`, `Zapper`, `loadWallet`, and wallet types from the Snort app.

## WalletStore — managing wallet lifecycle

```typescript
// Wallet/index.ts
export class WalletStore extends ExternalStore<WalletStoreSnapshot> {
  async #activateWallet(cfg: WalletConfig) {
    const w = await loadWallet(cfg.kind, cfg.data)  // factory: creates wallet by kind
    if (w) {
      w.on("change", d => this.#onWalletChange(cfg, d))
    }
    return w
  }
}

// Auto-detect WebLN
export function setupWebLNWalletConfig(store: WalletStore) {
  const existing = wallets.find(a => a.kind === WalletKind.WebLN)
  if (window.webln && !existing) {
    store.add({ id: "webln", kind: WalletKind.WebLN, active: wallets.length === 0, info: { alias: "WebLN" } })
  }
}
```

## LNDHub connection UI

```typescript
// LNDHub.tsx
async function tryConnect(config: string) {
  const connection = new LNDHubWallet(config)
  await connection.login()
  const info = await connection.getInfo()

  const newWallet = {
    id: uuid(),
    kind: WalletKind.LNDHub,
    active: true,
    info,
    data: config,
  } as WalletConfig
  Wallets.add(newWallet)
}
```

## ZapModal — full zap flow with Zapper

```typescript
// ZapModal.tsx
const [zapper, setZapper] = useState<Zapper>()
const [invoice, setInvoice] = useState<Array<ZapTargetResult>>()

useEffect(() => {
  if (props.targets && props.show) {
    const zapper = new Zapper(system, publisher)
    zapper.load(props.targets).then(() => {
      setZapper(zapper)
    })
  }
}, [props.targets, props.show, system, publisher])

// On user confirm:
const sends = await zapper.send(wallet, targetsWithComments, p.amount)
if (sends[0].error) {
  setError(sends[0].error.message)
} else if (sends.every(a => a.paid)) {
  setSuccess({})    // all paid immediately
} else {
  setInvoice(sends) // show invoice QR for manual payment
}
```

## Fast zap with barrierQueue

```typescript
// FooterZapButton.tsx
const fastZapInner = useCallback(async (targets: Array<ZapTarget>, amount: number) => {
  if (wallet) {
    await barrierQueue(ZapperQueue, async () => {
      const zapper = new Zapper(system, publisher)
      const result = await zapper.send(wallet, targets, amount)
      const totalSent = result.reduce((acc, v) => acc + v.sent, 0)
      if (totalSent > 0) {
        ZapPoolController?.allocate(totalSent)
      }
    })
  }
}, [wallet, system, publisher])

// Getting zap targets from event:
const getZapTarget = useCallback((): Array<ZapTarget> | undefined => {
  if (ev.tags.some(v => v[0] === "zap")) {
    return Zapper.fromEvent(ev)
  }
  return [{ type: "lnurl", value: author?.lud16 || author?.lud06, weight: 1, zap: { pubkey: ev.pubkey, event: link } }]
}, [ev, author, link])
```

## Wallet capability checks in the UI

```typescript
// wallet/index.tsx
wallet?.canCreateInvoice()   // Show receive button
wallet?.canPayInvoice()      // Show send button
wallet?.isReady()            // Show unlock UI

// Check payment state
if (result.state === WalletInvoiceState.Paid) {
  Toastore.push({ element: `Sent ${amtSend} sats...`, expire: unixNow() + 10, icon: "zap" })
}
```
