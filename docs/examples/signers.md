# Signers Examples

Real-world usage of signers, key storage, and custom `EventSigner` implementations from the Snort app.

## NIP-46 connect flow with ephemeral PrivateKeySigner

Generate an ephemeral client key for the nostrconnect:// flow:

```typescript
// sign-in.tsx
const clientSigner = PrivateKeySigner.random()
const clientPubkey = await clientSigner.getPubKey()
const connectUrl = `nostrconnect://${clientPubkey}?relay=...&secret=${secret}&perms=${NIP46_PERMS}`
const nip46 = new Nip46Signer(connectUrl, clientSigner)
await nip46.init()

// Store the NIP-46 session key with NotEncrypted (no PIN protection)
LoginStore.loginWithPubkey(
  loginPubkey,
  LoginSessionType.Nip46,
  undefined,
  nip46.relays,
  new NotEncrypted(unwrap(nip46.privateKey)),
)
```

## Custom EventSigner implementation (Nip7OsSigner)

The `EventSigner` interface can be implemented for custom signing backends:

```typescript
// Nip7OsSigner.ts
export class Nip7OsSigner implements EventSigner {
  #interface: Nip7os

  get supports(): string[] { return ["nip04"] }
  getPubKey(): string | Promise<string> { return this.#interface.getPublicKey() }
  nip4Encrypt(content: string, key: string): Promise<string> {
    return Promise.resolve(this.#interface.nip04_encrypt(content, key))
  }
  nip4Decrypt(content: string, otherKey: string): Promise<string> {
    return Promise.resolve(this.#interface.nip04_decrypt(content, otherKey))
  }
  sign(ev: NostrEvent): Promise<NostrEvent> {
    const ret = this.#interface.signEvent(JSON.stringify(ev))
    return Promise.resolve(JSON.parse(ret) as NostrEvent)
  }
}
```

## KeyStorage for encrypted key persistence

```typescript
// MultiAccountStore.ts
// Deserialize from stored payload
v.privateKeyData = KeyStorage.fromPayload(v.privateKeyData as object)

// Check instance type for serialization
if (v.privateKeyData instanceof KeyStorage) {
  toSave.push({ ...v, privateKeyData: v.privateKeyData.toPayload() })
}
```
