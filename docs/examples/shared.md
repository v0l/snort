# @snort/shared Examples

Real-world usage of `ExternalStore`, TLV utilities, `LNURL`, work queues, and `FeedCache` from the Snort app.

## ExternalStore for global state with React integration

Extend `ExternalStore` to create singleton state stores, then consume with `useSyncExternalStore`:

**WalletStore — managing wallet configurations:**

```typescript
// Wallet/index.ts
export class WalletStore extends ExternalStore<WalletStoreSnapshot> {
  #configs: Array<WalletConfig>

  save() {
    const json = JSON.stringify(this.#configs)
    window.localStorage.setItem("wallet-config", json)
    this.notifyChange()
  }

  takeSnapshot(): WalletStoreSnapshot {
    return {
      configs: [...this.#configs],
      config: this.#configs.find(a => a.active),
      wallet: this.get(),
    }
  }
}

// Consumed via React:
export function useWallet() {
  const wallet = useSyncExternalStore<WalletStoreSnapshot>(
    h => Wallets.hook(h),
    () => Wallets.snapshot(),
  )
}
```

**NoteCreatorStore — note creation UI state with selector support:**

```typescript
// State/NoteCreator.ts
class NoteCreatorStore extends ExternalStore<NoteCreatorDataSnapshot> {
  #updateFn = (fn: (v: NoteCreatorDataSnapshot) => void) => {
    fn(this.#data)
    this.notifyChange(this.#data)  // pass data to skip snapshot for perf
  }

  takeSnapshot(): NoteCreatorDataSnapshot {
    const sn = { ...this.#data, reset: this.#resetFn, update: this.#updateFn }
    return sn as NoteCreatorDataSnapshot
  }
}

// Consumed with selector support:
export function useNoteCreator<T extends object = NoteCreatorDataSnapshot>(
  selector?: (v: NoteCreatorDataSnapshot) => T,
) {
  return useSyncExternalStoreWithSelector<NoteCreatorDataSnapshot, T>(
    c => NoteCreatorState.hook(c),
    () => NoteCreatorState.snapshot(),
    undefined,
    selector || defaultSelector,
  )
}
```

**ToasterSlots — toast notification stack:**

```typescript
// Toaster/Toaster.tsx
class ToasterSlots extends ExternalStore<Array<ToastNotification>> {
  #stack: Array<ToastNotification> = []

  push(n: ToastNotification) {
    n.expire ??= unixNow() + 10
    this.#stack.push(n)
    this.notifyChange()
  }

  takeSnapshot(): ToastNotification[] {
    return [...this.#stack]
  }
}
export const Toastore = new ToasterSlots()
```

## TLV encoding for chat IDs

```typescript
// chat/nip17.ts
function computeChatId(u: UnwrappedGift, pk: string): string | undefined {
  const pTags = [...]
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort()
    .filter(a => a !== pk)

  return encodeTLVEntries(
    "nchat17",
    ...pTags.map(v => ({
      value: v,
      type: TLVEntryType.Author,
      length: v.length,
    }) as TLVEntry),
  )
}

// Decoding:
const participants = decodeTLV(id)
  .filter(v => v.type === TLVEntryType.Author)
  .map(v => ({ type: "pubkey" as const, id: v.value as string }))
```

## bech32ToHex / hexToBech32 for entity ID conversion

```typescript
// Utils/index.ts
export function parseId(id: string) {
  const hrp = ["note", "npub", "nsec"]
  try {
    if (hrp.some(a => id.startsWith(a))) {
      return bech32ToHex(id)
    }
  } catch (_e) {}
  return id
}

export function eventLink(hex: string, relays?: Array<string> | string) {
  const encoded = relays
    ? encodeTLV(NostrPrefix.Event, hexToBytes(hex), Array.isArray(relays) ? relays : [relays])
    : hexToBech32(NostrPrefix.Note, hex)
  return `/${encoded}`
}
```

## LNURL for ZapPool payouts

```typescript
// ZapPoolController.ts
async payout(wallet: LNWallet) {
  for (const x of this.#store.values()) {
    const profile = await ProfilesCache.get(x.pubkey)
    const svc = new LNURL(profile.lud16 || profile.lud06 || "")
    await svc.load()
    const invoice = await svc.getInvoice(amtSend, `SnortZapPool: ${x.split}%`)
    if (invoice.pr) {
      const result = await wallet.payInvoice(invoice.pr)
    }
  }
}
```

## processWorkQueue / barrierQueue for serialized async operations

```typescript
// ZapperQueue.tsx
export const ZapperQueue: Array<WorkQueueItem> = []
processWorkQueue(ZapperQueue)

// FooterZapButton.tsx
await barrierQueue(ZapperQueue, async () => {
  const zapper = new Zapper(system, publisher)
  const result = await zapper.send(wallet, targets, amount)
})
```

## FeedCache as a base class for refresh feeds

```typescript
// RefreshFeedCache.ts
export abstract class RefreshFeedCache<T> extends FeedCache<TWithCreated<T>> {
  abstract buildSub(session: LoginSession, rb: RequestBuilder): void
  abstract onEvent(evs: Readonly<Array<TaggedNostrEvent>>, pubKey: string, pub?: EventPublisher): void

  protected newest(filter?: (e: TWithCreated<T>) => boolean) {
    let ret = 0
    this.cache.forEach(v => {
      if (!filter || filter(v)) {
        ret = v.created_at > ret ? v.created_at : ret
      }
    })
    return ret
  }
}
```
