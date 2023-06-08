import { EventKind, HexKey, NostrEvent } from ".";
export declare class EventBuilder {
    #private;
    kind(k: EventKind): this;
    content(c: string): this;
    createdAt(n: number): this;
    pubKey(k: string): this;
    tag(t: Array<string>): EventBuilder;
    /**
     * Extract mentions
     */
    processContent(): this;
    build(): NostrEvent;
    /**
     * Build and sign event
     * @param pk Private key to sign event with
     */
    buildAndSign(pk: HexKey): Promise<NostrEvent>;
}
//# sourceMappingURL=EventBuilder.d.ts.map