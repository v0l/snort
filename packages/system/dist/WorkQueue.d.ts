export interface WorkQueueItem {
    next: () => Promise<unknown>;
    resolve(v: unknown): void;
    reject(e: unknown): void;
}
export declare function processWorkQueue(queue?: Array<WorkQueueItem>, queueDelay?: number): Promise<void>;
export declare const barrierQueue: <T>(queue: Array<WorkQueueItem>, then: () => Promise<T>) => Promise<T>;
//# sourceMappingURL=WorkQueue.d.ts.map