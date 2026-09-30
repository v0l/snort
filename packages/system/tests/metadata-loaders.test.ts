import { describe, expect, test } from "bun:test"
import type { CachedTable } from "@snort/shared"
import { EventKind, type SystemInterface } from "../src"
import { MetadataRelays } from "../src/const"
import { RelayMetadataLoader } from "../src/outbox"
import { ProfileLoaderService } from "../src/profile-cache"

class ExposedProfileLoader extends ProfileLoaderService {
  build(keys: Array<string>) {
    return this.buildSub(keys).buildRaw()
  }
}

class ExposedRelayLoader extends RelayMetadataLoader {
  build(keys: Array<string>) {
    return this.buildSub(keys).buildRaw()
  }
}

const system = {} as SystemInterface
const cache = {} as CachedTable<never>
const keys = ["aa".repeat(32), "bb".repeat(32)]

describe("metadata loaders", () => {
  test("profiles are asked of the user's relays and the metadata relays", () => {
    const loader = new ExposedProfileLoader(system, cache)
    const filters = loader.build(keys)
    loader.destroy()
    expect(filters).toEqual([
      { kinds: [EventKind.SetMetadata], authors: keys },
      { kinds: [EventKind.SetMetadata], authors: keys, relays: MetadataRelays },
    ])
  })

  test("relay lists are asked of the user's relays and the metadata relays", () => {
    const loader = new ExposedRelayLoader(system, cache)
    const filters = loader.build(keys)
    loader.destroy()
    const kinds = [EventKind.Relays, EventKind.ContactList]
    expect(filters).toEqual([
      { authors: keys, kinds },
      { authors: keys, kinds, relays: MetadataRelays },
    ])
  })
})
