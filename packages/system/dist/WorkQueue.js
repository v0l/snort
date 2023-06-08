"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.barrierQueue = exports.processWorkQueue = void 0;
async function processWorkQueue(queue, queueDelay = 200) {
    while (queue && queue.length > 0) {
        const v = queue.shift();
        if (v) {
            try {
                const ret = await v.next();
                v.resolve(ret);
            }
            catch (e) {
                v.reject(e);
            }
        }
    }
    setTimeout(() => processWorkQueue(queue, queueDelay), queueDelay);
}
exports.processWorkQueue = processWorkQueue;
const barrierQueue = async (queue, then) => {
    return new Promise((resolve, reject) => {
        queue.push({
            next: then,
            resolve,
            reject,
        });
    });
};
exports.barrierQueue = barrierQueue;
//# sourceMappingURL=WorkQueue.js.map