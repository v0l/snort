export interface WorkQueueItem {
  next: () => Promise<unknown>;
  resolve(v: unknown): void;
  reject(e: unknown): void;
}

export async function processWorkQueue(queue?: Array<WorkQueueItem>, queueDelay = 200) {
  while (queue && queue.length > 0) {
    const v = queue.shift();
    if (v) {
      try {
        const ret = await v.next();
        v.resolve(ret);
      } catch (e) {
        v.reject(e);
      }
    }
  }
  setTimeout(() => processWorkQueue(queue, queueDelay), queueDelay);
}

export const barrierQueue = async <T>(queue: Array<WorkQueueItem>, then: () => Promise<T>): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    queue.push({
      next: then,
      resolve,
      reject,
    });
  });
};
