import { unixNowMs } from "@snort/shared"
import { EventKind, RequestBuilder, type TaggedNostrEvent } from "."
import { BackgroundLoader } from "./background-loader"
import { type CachedMetadata, mapEventToProfile } from "./cache"
import { ProfileCacheExpire } from "./const"

export type { ProfilePriority } from "./background-loader"

export class ProfileLoaderService extends BackgroundLoader<CachedMetadata> {
  override name(): string {
    return "ProfileLoaderService"
  }

  override onEvent(e: Readonly<TaggedNostrEvent>): CachedMetadata | undefined {
    return mapEventToProfile(e)
  }

  override getExpireCutoff(): number {
    return unixNowMs() - ProfileCacheExpire
  }

  override buildSub(missing: string[]): RequestBuilder {
    const sub = new RequestBuilder(`profiles`)
    sub.withFilter().kinds([EventKind.SetMetadata]).authors(missing)
    return sub
  }
}
