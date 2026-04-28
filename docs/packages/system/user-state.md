# User State

Managing a user's complete state: profile, follows, relays, app data, and NIP-51 lists.

## `UserState<TAppData>`

`UserState` provides a high-level API for reading and writing a user's Nostr state with safe sync semantics.

### Constructor

```typescript
import { UserState } from '@snort/system'

const state = new UserState<AppData>(
  'pubkey',
  {
    appdataId: 'my-app-data',
    initAppdata: { theme: 'light' } as AppData,
    encryptAppdata: true,
  },
  {
    // Optional: initial state object for fast startup
    profile: cachedProfile,
    follows: cachedFollows,
    relays: cachedRelays,
    appdata: cachedAppData,
  }
)
```

### Options

```typescript
interface UserStateOptions<T> {
  appdataId: string           // d-tag for app data event
  initAppdata: T              // Default app data value
  encryptAppdata: boolean     // NIP-44 encrypt app data
}
```

### State Object

```typescript
interface UserStateObject<TAppData> {
  profile?: UserMetadata
  follows?: Array<string>
  relays?: Array<FullRelaySettings>
  appdata?: TAppData
}
```

## Initialization

```typescript
await state.init(signer, system)
```

This loads and syncs all state from relays.

## Reading State

### `get profile(): UserMetadata | undefined`

Get current profile data.

```typescript
const profile = state.profile
console.log(profile?.name, profile?.about)
```

### `get follows(): Array<string>`

Get list of followed pubkeys.

```typescript
const followList = state.follows
```

### `get relays(): Array<FullRelaySettings>`

Get user's relay list.

```typescript
const relays = state.relays
```

### `get appdata(): TAppData | undefined`

Get app-specific data.

```typescript
const data = state.appdata
console.log(data?.theme)
```

### `getList(kind: EventKind): DiffSyncTags | undefined`

Get any NIP-51 list by kind.

```typescript
const muteList = state.getList(EventKind.MuteList)
const bookmarks = state.getList(EventKind.BookmarksList)
```

## Writing State

### `updateProfile(profile: UserMetadata): Promise<void>`

Update user profile. Only writes if the profile is newer.

```typescript
await state.updateProfile({
  name: 'kieran',
  about: 'Building stuff',
  picture: 'https://example.com/avatar.png',
})
```

### `updateFollows(follows: Array<string>): Promise<void>`

Update contact list.

```typescript
await state.updateFollows(['pubkey1', 'pubkey2', 'pubkey3'])
```

### `updateRelays(relays: Array<FullRelaySettings>): Promise<void>`

Update relay list.

```typescript
await state.updateRelays([
  { url: 'wss://relay.snort.social', settings: { read: true, write: true } },
  { url: 'wss://nos.lol', settings: { read: true, write: false } },
])
```

### `updateAppData(data: TAppData): Promise<void>`

Update app data.

```typescript
await state.updateAppData({
  theme: 'dark',
  lastRead: Date.now(),
})
```

### `updateList(kind: EventKind, tags: Array<Array<string>>): Promise<void>`

Update a NIP-51 list.

```typescript
await state.updateList(EventKind.MuteList, [
  ['p', 'pubkey-to-mute'],
])
```

## Change Events

```typescript
import { UserStateChangeType } from '@snort/system'

state.on('change', (type) => {
  switch (type) {
    case UserStateChangeType.Profile:
      console.log('Profile updated')
      break
    case UserStateChangeType.Contacts:
      console.log('Follows updated')
      break
    case UserStateChangeType.Relays:
      console.log('Relays updated')
      break
    case UserStateChangeType.AppData:
      console.log('App data updated')
      break
    case UserStateChangeType.MuteList:
      console.log('Mute list updated')
      break
    case UserStateChangeType.GenericList:
      console.log('Generic list updated')
      break
  }
})
```

## DiffSyncTags

Low-level sync mechanism for tag-based lists (kind 3, kind 10002, NIP-51 lists).

- Computes diff between local and remote tags
- Merges and publishes the merged result
- Prevents data loss from concurrent edits

## JsonEventSync

Low-level sync mechanism for JSON content events (kind 0 profile, kind 30078 app data).

- Parses JSON content
- Only writes if newer
- Handles encryption for app data

## See Also

- [Examples → User State](/examples/user-state)
