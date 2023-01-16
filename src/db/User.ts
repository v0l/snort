import { HexKey, TaggedRawEvent, UserMetadata } from "../nostr";

export interface MetadataCache extends UserMetadata {
    /**
     * When the object was saved in cache
     */
    loaded: number,

    /**
     * When the source metadata event was created
     */
    created: number,

    /**
     * The pubkey of the owner of this metadata
     */
    pubkey: HexKey
};

export function mapEventToProfile(ev: TaggedRawEvent) {
    try {
        let data: UserMetadata = JSON.parse(ev.content);
        return {
            pubkey: ev.pubkey,
            created: ev.created_at,
            loaded: new Date().getTime(),
            ...data
        } as MetadataCache;
    } catch (e) {
        console.error("Failed to parse JSON", ev, e);
    }
}