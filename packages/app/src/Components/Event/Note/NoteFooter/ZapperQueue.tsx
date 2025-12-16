import { processWorkQueue, type WorkQueueItem } from "@snort/shared";

export const ZapperQueue: Array<WorkQueueItem> = [];

processWorkQueue(ZapperQueue);
