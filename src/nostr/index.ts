export interface RawEvent {
    id: string,
    pubkey: string,
    created_at: number,
    kind: number,
    tags: string[][],
    content: string,
    sig: string
}