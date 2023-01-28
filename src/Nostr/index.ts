export type RawEvent = {
    id: u256,
    pubkey: HexKey,
    created_at: number,
    kind: number,
    tags: string[][],
    content: string,
    sig: string
}

export interface TaggedRawEvent extends RawEvent {
    /**
     * A list of relays this event was seen on
     */
    relays: string[]
}

/**
 * Basic raw key as hex
 */
export type HexKey = string;

/**
 * A 256bit hex id
 */
export type u256 = string;

/**
 * Raw REQ filter object
 */
export type RawReqFilter = {
    ids?: u256[],
    authors?: u256[],
    kinds?: number[],
    "#e"?: u256[],
    "#p"?: u256[],
    "#t"?: string[],
    search?: string,
    since?: number,
    until?: number,
    limit?: number
}

/**
 * Medatadata event content
 */
export type UserMetadata = {
    name?: string,
    display_name?: string,
    about?: string,
    picture?: string,
    website?: string,
    banner?: string,
    nip05?: string,
    lud06?: string,
    lud16?: string
}
