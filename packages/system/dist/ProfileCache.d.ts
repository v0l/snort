import { HexKey, SystemInterface, TaggedRawEvent } from ".";
import { CacheStore, MetadataCache } from "./cache";
export declare class ProfileLoaderService {
    #private;
    /**
     * List of pubkeys to fetch metadata for
     */
    WantsMetadata: Set<HexKey>;
    constructor(system: SystemInterface, cache: CacheStore<MetadataCache>);
    /**
     * Request profile metadata for a set of pubkeys
     */
    TrackMetadata(pk: HexKey | Array<HexKey>): void;
    /**
     * Stop tracking metadata for a set of pubkeys
     */
    UntrackMetadata(pk: HexKey | Array<HexKey>): void;
    onProfileEvent(e: Readonly<TaggedRawEvent>): Promise<void>;
}
//# sourceMappingURL=ProfileCache.d.ts.map