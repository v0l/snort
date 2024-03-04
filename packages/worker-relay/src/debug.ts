
let debug = false;
export function debugLog(scope: string, msg: string, ...args: Array<any>) {
    if (!debug) return;
    console.log(scope, msg, ...args);
}

export function setLogging(v: boolean) {
    debug = v;
}