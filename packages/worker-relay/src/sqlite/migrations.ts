import { debugLog } from "../debug"
import type { NostrEvent } from "../types"
import type { SqliteRelay } from "./sqlite-relay"
import { MIGRATIONS } from "./shared"

const log = (msg: string, ...args: Array<any>) => debugLog("SqliteRelay:migrations", msg, ...args)

async function migrate(relay: SqliteRelay) {
  if (!relay.db) throw new Error("DB must be open")

  relay.db.exec(
    "CREATE TABLE IF NOT EXISTS __migration (\
    version INTEGER PRIMARY KEY, \
    migrated_at INTEGER \
  )",
  )
  const res = relay.db.exec("SELECT MAX(version) FROM __migration", { returnValue: "resultRows" })
  let currentVersion = (res[0][0] as number | undefined) ?? 0

  for (const { version, sql } of MIGRATIONS) {
    if (currentVersion < version) {
      log(`Migrating to v${version}`)
      await relay.db.transaction(db => {
        for (const stmt of sql) {
          db.exec(stmt, {
            bind: stmt.includes("INSERT INTO __migration") ? [Date.now() / 1000] : undefined,
          })
        }
        // v3 needs to re-index existing profile events
        if (version === 3) {
          const events = db.selectArrays("select json from events where kind in (?,?)", [0, 1])
          for (const json of events) {
            const ev = JSON.parse(json[0] as string) as NostrEvent
            if (ev) {
              relay.insertIntoSearchIndex(db, ev)
            }
          }
        }
      })
      currentVersion = version
    }
  }
}

export default migrate
