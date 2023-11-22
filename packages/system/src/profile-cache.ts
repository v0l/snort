import { unixNowMs } from "@snort/shared";
import { EventKind, TaggedNostrEvent, RequestBuilder } from ".";
import { ProfileCacheExpire } from "./const";
import { mapEventToProfile, MetadataCache } from "./cache";
import { v4 as uuid } from "uuid";
import { BackgroundLoader } from "./background-loader";

export class ProfileLoaderService extends BackgroundLoader<MetadataCache> {
  override name(): string {
    return "ProfileLoaderService";
  }

  override onEvent(e: Readonly<TaggedNostrEvent>): MetadataCache | undefined {
    return mapEventToProfile(e);
  }

  override getExpireCutoff(): number {
    return unixNowMs() - ProfileCacheExpire;
  }

  override buildSub(missing: string[]): RequestBuilder {
    const sub = new RequestBuilder(`profiles-${uuid()}`);
    sub
      .withOptions({
        skipDiff: true,
      })
      .withFilter()
      .kinds([EventKind.SetMetadata])
      .authors(missing);
    return sub;
  }

  protected override makePlaceholder(key: string): MetadataCache | undefined {
    return {
      pubkey: key,
      loaded: unixNowMs() - ProfileCacheExpire + 30_000,
      created: 0,
    } as MetadataCache;
  }
}
