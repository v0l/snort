# User State Examples

Real-world usage of `UserState` and `DiffSyncTags` from the Snort app.

## Creating UserState for a new login session

```typescript
// MultiAccountStore.ts
state: new UserState<SnortAppData>(key, {
  initAppdata: {
    preferences: { ...DefaultPreferences, ...CONFIG.defaultPreferences },
  },
  encryptAppdata: true,
  appdataId: "snort",
})
```

## Rehydrating UserState from serialized storage

When the page reloads, reconstruct `UserState` from localStorage:

```typescript
// MultiAccountStore.ts
const stateObj = v.state as unknown as UserStateObject<SnortAppData> | undefined
const stateClass = new UserState<SnortAppData>(
  v.publicKey!,
  {
    initAppdata: stateObj?.appdata ?? { preferences: { ...DefaultPreferences, ...CONFIG.defaultPreferences } },
    encryptAppdata: true,
    appdataId: "snort",
  },
  stateObj, // pass serialized state for rehydration
)
MultiAccountStore.enableStandardLists(stateClass)
stateClass.on("change", () => this.#save())

// Register standard list tracking
private static enableStandardLists<T>(state: UserState<T>) {
  state.checkIsStandardList(EventKind.BlossomServerList)
  state.checkIsStandardList(EventKind.PinList)
  state.checkIsStandardList(EventKind.BookmarksList)
}
```

## Mute/unmute with list operations

```typescript
// useModeration.tsx
const link = NostrLink.publicKey(id)
state.mute(link)
await state.saveList(EventKind.MuteList)

// Get list items and filter
state.getList(EventKind.MuteList)
  .filter(a => a instanceof UnknownTag && a.value[0] === "word")
  .map(a => (a as UnknownTag).value[1])
```

## App data persistence

```typescript
// Functions.ts
session.state.setAppData(data)         // update in-memory
await session.state.saveAppData()       // encrypt & publish kind 30078 event
```

## Custom tag types for list management

Implement `ToNostrEventTag` to use custom tag structures with `UserState` list operations:

```typescript
// useModeration.tsx
export class MutedWordTag implements ToNostrEventTag {
  constructor(readonly word: string) {}
  equals(other: ToNostrEventTag): boolean {
    return other instanceof MutedWordTag && other.word === this.word
  }
  toEventTag(): string[] | undefined {
    return ["word", this.word.toLowerCase()]
  }
}
// Used with UserState list operations:
state.addToList(EventKind.MuteList, new MutedWordTag(w.toLowerCase()))
```
