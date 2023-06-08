type HookFn<TSnapshot> = (e?: TSnapshot) => void;
/**
 * Simple React hookable store with manual change notifications
 */
export default abstract class ExternalStore<TSnapshot> {
    #private;
    hook(fn: HookFn<TSnapshot>): () => void;
    snapshot(): Readonly<TSnapshot>;
    protected notifyChange(sn?: TSnapshot): void;
    abstract takeSnapshot(): TSnapshot;
}
export {};
//# sourceMappingURL=ExternalStore.d.ts.map