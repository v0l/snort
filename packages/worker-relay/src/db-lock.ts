import { debugLog } from "./debug"

const log = (msg: string, ...args: Array<any>) => debugLog("DbLock", msg, ...args)

/**
 * An exclusive claim on the database.
 *
 * The lock is backed by the Web Locks API, which releases automatically when the
 * holding context goes away (tab closed, renderer crashed, worker terminated).
 * That auto-release is the whole point: an OPFS sync access handle held by a dead
 * renderer is not something we can detect or reclaim from another tab, but a lock
 * held by that same renderer is dropped for us.
 */
export interface DbLock {
  /** Release the lock, allowing another context to become the owner */
  release(): void
}

export interface RequestDbLockOptions {
  /**
   * When true, return `undefined` immediately if another context holds the lock
   * instead of waiting in the queue for it.
   */
  ifAvailable?: boolean
}

/**
 * A no-op lock used when the Web Locks API is unavailable.
 *
 * Every browser that can run the OPFS SQLite VFS also has Web Locks (Chrome 69+,
 * Edge 79+, Firefox 96+, Safari 15.4+, all well ahead of OPFS `createSyncAccessHandle`),
 * so in practice this only applies to non-browser environments such as tests.
 */
const UNSUPPORTED_LOCK: DbLock = { release: () => {} }

/**
 * Take an exclusive lock naming this database.
 *
 * Resolves with a {@link DbLock} once ownership is granted, or `undefined` when
 * `ifAvailable` was requested and somebody else already owns it.
 */
export function requestDbLock(name: string, options: RequestDbLockOptions = {}): Promise<DbLock | undefined> {
  const locks = globalThis.navigator?.locks
  if (!locks) {
    log("Web Locks unavailable, proceeding without an ownership lock")
    return Promise.resolve(UNSUPPORTED_LOCK)
  }

  return new Promise<DbLock | undefined>((resolve, reject) => {
    let settled = false
    locks
      .request(name, { mode: "exclusive", ifAvailable: options.ifAvailable }, lock => {
        if (!lock) {
          // Only possible with ifAvailable: somebody else owns the database
          settled = true
          resolve(undefined)
          return
        }
        // Hold the lock until release() is called. The callback's promise is the
        // lock's lifetime, so it must stay pending for as long as we are the owner.
        return new Promise<void>(releaseLock => {
          settled = true
          log(`Acquired ${name}`)
          resolve({
            release: () => {
              log(`Released ${name}`)
              releaseLock()
            },
          })
        })
      })
      .catch(e => {
        // A rejection after we handed out the lock means the holder promise was
        // rejected, which we never do; anything else failed before acquisition.
        if (!settled) reject(e)
      })
  })
}

/** Lock name for the database at `path`, scoped so different databases don't contend */
export function dbLockName(path: string) {
  return `snort:worker-relay:${path}`
}
