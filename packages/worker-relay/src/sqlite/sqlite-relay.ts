import sqlite3InitModule, { type Database, type SAHPoolUtil, type Sqlite3Static } from "@sqlite.org/sqlite-wasm"
import { EventEmitter } from "eventemitter3"
import { debugLog } from "../debug"
import {
  type EventMetadata,
  type NostrEvent,
  type RelayHandler,
  type RelayHandlerEvents,
  type ReqFilter,
  unixNowMs,
} from "../types"
import { runFixers } from "./fixers"
import migrate from "./migrations"
import { buildQuery, buildSearchContent, repeatParams } from "./shared"

// Maximum number of event IDs to keep in the in-memory dedup cache.
// Each entry is a 64-char hex string (~64 bytes); 50k entries ≈ 3 MB.
// When the cap is hit the entire set is cleared — correctness is preserved
// because INSERT OR IGNORE provides the definitive dedup at the DB layer.
const MAX_SEEN_INSERTS = 50_000

export class SqliteRelay extends EventEmitter<RelayHandlerEvents> implements RelayHandler {
  #sqlite?: Sqlite3Static
  #log = (msg: string, ...args: Array<any>) => debugLog("SqliteRelay", msg, ...args)
  db?: Database
  #pool?: SAHPoolUtil
  #seenInserts = new Set<string>()
  #searchableTagsByKind = new Map<number, Set<string>>()
  /** True while dump() is exporting the DB file; used to guard concurrent DB access. */
  #isDumping = false

  /**
   * Configure which event tags should be indexed for full-text search by kind
   */
  configureSearchIndex(kindTagsMapping: Record<number, string[]>) {
    this.#searchableTagsByKind.clear()
    for (const [kind, tags] of Object.entries(kindTagsMapping)) {
      this.#searchableTagsByKind.set(parseInt(kind, 10), new Set(tags))
    }
    this.#log(`Updated searchable tags by kind:`, kindTagsMapping)
  }

  /**
   * Initialize the SQLite driver
   */
  async init(path: string) {
    if (this.#sqlite) return
    this.#sqlite = await sqlite3InitModule({
      print: msg => this.#log(msg),
      printErr: msg => this.#log(msg),
    })
    this.#log(`Got SQLite version: ${this.#sqlite.version.libVersion}`)
    await this.#open(path)
    if (this.db) {
      await migrate(this)
      // don't await to avoid timeout
      runFixers(this)
    }
  }

  /**
   * Open the database from its path
   */
  async #open(path: string) {
    if (!this.#sqlite) throw new Error("Must call init first")
    if (this.db) return

    this.#pool = await this.#sqlite.installOpfsSAHPoolVfs({})
    this.db = new this.#pool.OpfsSAHPoolDb(path)
    this.#log(`Opened ${this.db.filename}`)
  }

  /**
   * Delete all data
   */
  async wipe() {
    if (this.#pool && this.db) {
      const dbName = this.db.filename
      this.close()
      await this.#pool.wipeFiles()
      await this.#open(dbName)
      await migrate(this)
    }
  }

  close() {
    this.db?.close()
    this.db = undefined
  }

  /**
   * Insert an event to the database
   */
  event(ev: NostrEvent) {
    if (this.#isDumping || !this.db) return false
    if (this.#insertEvent(this.db, ev)) {
      this.#log(`Inserted: kind=${ev.kind},authors=${ev.pubkey},id=${ev.id}`)
      this.emit("event", [ev])
      return true
    }
    return false
  }

  sql(sql: string, params: Array<any>) {
    return this.db?.selectArrays(sql, params) as Array<Array<string | number>>
  }

  /**
   * Write multiple events
   */
  eventBatch(evs: Array<NostrEvent>) {
    if (this.#isDumping || !this.db) return false
    const start = unixNowMs()
    const eventsInserted: Array<NostrEvent> = []
    this.db?.transaction(db => {
      for (const ev of evs) {
        if (this.#insertEvent(db, ev)) {
          eventsInserted.push(ev)
        }
      }
    })
    if (eventsInserted.length > 0) {
      this.#log(`Inserted Batch: ${eventsInserted.length}/${evs.length}, ${(unixNowMs() - start).toLocaleString()}ms`)
      this.emit("event", eventsInserted)
    }
    return eventsInserted.length > 0
  }

  setEventMetadata(id: string, meta: EventMetadata) {
    if (meta.seen_at) {
      this.db?.exec("update events set seen_at = ? where id = ?", {
        bind: [meta.seen_at, id],
      })
    }
  }

  /**
   * Set seen_at for a batch of events in a single UPDATE statement.
   * All ids receive the same seen_at timestamp.
   */
  batchSetSeenAt(ids: Array<string>, seen_at: number) {
    if (ids.length === 0 || !this.db) return
    this.db.exec(`update events set seen_at = ? where id in (${repeatParams(ids.length)})`, {
      bind: [seen_at, ...ids],
    })
  }

  #deleteById(db: Database, ids: Array<string>) {
    if (ids.length === 0) return
    db.exec(`delete from events where id in (${repeatParams(ids.length)})`, {
      bind: ids,
    })
    const deleted = db.changes()
    db.exec(`delete from search_content where id in (${repeatParams(ids.length)})`, {
      bind: ids,
    })
    this.#log("Deleted", ids, deleted)
  }

  #insertEvent(db: Database, ev: NostrEvent) {
    if (this.#seenInserts.has(ev.id)) return false

    const legacyReplaceableKinds = [0, 3, 41]

    // handle deletes
    if (ev.kind === 5) {
      // delete using a request filter, take e/a tags for making a filter
      const eTags = ev.tags.filter(a => a[0] === "e").map(a => a[1])
      const deletedE = this.delete({
        ids: eTags,
        authors: [ev.pubkey],
      })

      // a tags are harder to delete, just delete one-by-one to avoid multiple authors/kinds
      let aDeleted = 0
      const aTags = ev.tags.filter(a => a[0] === "a").map(a => a[1])
      for (const t of aTags) {
        const aSplit = t.split(":")
        // check if the event author is the author of the a tag
        if (aSplit[1] !== ev.pubkey) {
          this.#log("Skipping delete request for %s from %s, pubkey doesnt match", t, ev.pubkey)
          continue
        }
        const k = Number(aSplit[0])
        if (Number.isNaN(k)) {
          continue
        }
        aDeleted += this.delete({
          authors: [ev.pubkey],
          kinds: [k],
          "#d": [aSplit[2]],
        }).length
      }
      return deletedE.length > 0 || aDeleted > 0
    }

    // Handle legacy and standard replaceable events (kinds 0, 3, 41, 10000-19999)
    if (legacyReplaceableKinds.includes(ev.kind) || (ev.kind >= 10_000 && ev.kind < 20_000)) {
      const oldEvents = db.selectValues(`SELECT id FROM events WHERE kind = ? AND pubkey = ? AND created <= ?`, [
        ev.kind,
        ev.pubkey,
        ev.created_at,
      ]) as Array<string>

      if (oldEvents.includes(ev.id)) {
        // Already have this event
        this.#markSeen(ev.id)
        return false
      } else {
        // Delete older events of the same kind and pubkey
        this.#deleteById(db, oldEvents)
      }
    }

    // Handle parameterized replaceable events (kinds 30000-39999)
    if (ev.kind >= 30_000 && ev.kind < 40_000) {
      const dTag = ev.tags.find(a => a[0] === "d")?.[1] ?? ""

      const oldEvents = db.selectValues(
        `SELECT e.id
         FROM events e
         JOIN tags t ON e.id = t.event_id
         WHERE e.kind = ? AND e.pubkey = ? AND t.key = ? AND t.value = ? AND created <= ?`,
        [ev.kind, ev.pubkey, "d", dTag, ev.created_at],
      ) as Array<string>

      if (oldEvents.includes(ev.id)) {
        // Already have this event
        this.#markSeen(ev.id)
        return false
      } else {
        // Delete older events with the same kind, pubkey, and d tag
        this.#deleteById(db, oldEvents)
      }
    }

    // Proceed to insert the new event
    const evInsert = { ...ev }
    delete evInsert.relays // Remove non-DB fields

    db.exec(
      `INSERT OR IGNORE INTO events(id, pubkey, created, kind, json, relays) 
       VALUES(?,?,?,?,?,?)`,
      {
        bind: [ev.id, ev.pubkey, ev.created_at, ev.kind, JSON.stringify(evInsert), (ev.relays ?? []).join(",")],
      },
    )

    const insertedEvents = db.changes()
    if (insertedEvents > 0) {
      // Insert all tags in a single multi-row INSERT to avoid per-tag SQL roundtrips
      const tagRows = ev.tags.filter(a => a[0].length === 1)
      if (tagRows.length > 0) {
        const placeholders = tagRows.map(() => "(?, ?, ?)").join(", ")
        const tagParams: Array<string> = []
        for (const t of tagRows) {
          tagParams.push(ev.id, t[0], t[1] ?? "")
        }
        db.exec(`INSERT INTO tags(event_id, key, value) VALUES ${placeholders}`, {
          bind: tagParams,
        })
      }
      this.insertIntoSearchIndex(db, ev)
    } else {
      this.#updateRelays(db, ev)
      return false
    }

    this.#markSeen(ev.id)
    return true
  }

  /**
   * Append relays
   */
  #updateRelays(db: Database, ev: NostrEvent) {
    const relays = db.selectArrays("select relays from events where id = ?", [ev.id])
    const oldRelays = new Set((relays?.at(0)?.at(0) as string | null)?.split(",") ?? [])
    let hasNew = false
    for (const r of ev.relays ?? []) {
      if (!oldRelays.has(r)) {
        oldRelays.add(r)
        hasNew = true
      }
    }
    if (hasNew) {
      db.exec("update events set relays = ? where id = ?", {
        bind: [[...oldRelays].join(","), ev.id],
      })
    }
  }

  /**
   * Query relay by nostr filter
   */
  req(id: string, req: ReqFilter) {
    const start = unixNowMs()

    const { sql, params } = buildQuery(req)
    const res = this.db?.selectArrays(sql, params)
    const results =
      res?.map(a => {
        if (req.ids_only === true) {
          return a[0] as string
        }
        const ev = JSON.parse(a[0] as string) as NostrEvent
        return {
          ...ev,
          relays: (a[1] as string | null)?.split(","),
        }
      }) ?? []
    const time = unixNowMs() - start
    this.#log(`Query ${id} results took ${time.toLocaleString()}ms`, req)
    return results
  }

  /**
   * Count results by nostr filter
   */
  count(req: ReqFilter) {
    const start = unixNowMs()
    const { sql, params } = buildQuery(req, { count: true })
    const rows = this.db?.exec(sql, {
      bind: params,
      returnValue: "resultRows",
    })
    const results = (rows?.at(0)?.at(0) as number | undefined) ?? 0
    const time = unixNowMs() - start
    this.#log(`Query count results took ${time.toLocaleString()}ms`)
    return results
  }

  /**
   * Delete events by nostr filter
   */
  delete(req: ReqFilter) {
    this.#log(`Starting delete of ${JSON.stringify(req)}`)
    const start = unixNowMs()
    const for_delete = this.req("ids-for-delete", { ...req, ids_only: true }) as Array<string>

    const grouped = for_delete.reduce(
      (acc, v, i) => {
        const batch = (i / 1000).toFixed(0)
        acc[batch] ??= []
        acc[batch].push(v)
        return acc
      },
      {} as Record<string, Array<string>>,
    )
    this.#log(`Starting delete of ${Object.keys(grouped).length} batches`)
    Object.entries(grouped).forEach(([_batch, ids]) => {
      this.#deleteById(this.db!, ids)
    })
    const time = unixNowMs() - start
    this.#log(`Delete ${for_delete.length} events took ${time.toLocaleString()}ms`)
    return for_delete
  }

  /**
   * Get a summary about events table
   */
  summary() {
    const res = this.db?.exec("select kind, count(*) from events group by kind", {
      returnValue: "resultRows",
    })
    return Object.fromEntries(res?.map(a => [String(a[0]), a[1] as number]) ?? [])
  }

  /**
   * Dump the database file.
   * Sets #isDumping for the duration so that concurrent DB calls (event, req, etc.)
   * can detect the export window and avoid operating on a closed/undefined db.
   */
  async dump() {
    if (this.#isDumping) {
      this.#log("dump() called while already dumping, skipping")
      return new Uint8Array()
    }
    const filePath = String(this.db?.filename ?? "")
    if (this.db && this.#pool) {
      this.#isDumping = true
      try {
        return await this.#pool.exportFile(`/${filePath}`)
      } catch (e) {
        console.error(e)
      } finally {
        this.#isDumping = false
        await this.#open(filePath)
      }
    }
    return new Uint8Array()
  }


  insertIntoSearchIndex(db: Database, ev: NostrEvent) {
    const content = buildSearchContent(ev, this.#searchableTagsByKind)
    if (content.trim().length > 0) {
      db.exec("insert into search_content values(?,?)", {
        bind: [ev.id, content],
      })
    }
  }

  /**
   * Add an event ID to the dedup cache, evicting the entire cache when the
   * cap is reached. Correctness is preserved by INSERT OR IGNORE at the DB layer.
   */
  #markSeen(id: string) {
    if (this.#seenInserts.size >= MAX_SEEN_INSERTS) {
      this.#log(`#seenInserts cap reached (${MAX_SEEN_INSERTS}), clearing dedup cache`)
      this.#seenInserts.clear()
    }
    this.#seenInserts.add(id)
  }
}
