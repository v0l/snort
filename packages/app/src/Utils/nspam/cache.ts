const DB_NAME = "nspam"
const STORE = "scores"

export interface CachedScore {
  id: string
  score: number
  model: string
  at: number
}

let dbPromise: Promise<IDBDatabase | undefined> | undefined

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise<IDBDatabase | undefined>(resolve => {
    if (typeof indexedDB === "undefined") return resolve(undefined)
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(undefined)
  })
  return dbPromise
}

export async function readScores(ids: ReadonlyArray<string>, model: string) {
  const out = new Map<string, number>()
  const db = await openDb()
  if (!db || ids.length === 0) return out
  await new Promise<void>(resolve => {
    const tx = db.transaction(STORE, "readonly")
    const store = tx.objectStore(STORE)
    for (const id of ids) {
      const req = store.get(id)
      req.onsuccess = () => {
        const row = req.result as CachedScore | undefined
        if (row && row.model === model) out.set(row.id, row.score)
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
  return out
}

export async function writeScores(rows: ReadonlyArray<CachedScore>) {
  const db = await openDb()
  if (!db || rows.length === 0) return
  await new Promise<void>(resolve => {
    const tx = db.transaction(STORE, "readwrite")
    const store = tx.objectStore(STORE)
    for (const row of rows) store.put(row)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}
