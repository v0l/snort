import type { Database } from "bun:sqlite"
import type { OkResponse, ReqCommand, ReqFilter, TaggedNostrEvent } from "@snort/system"
import type { CacheRelay } from "@snort/system"
import { buildQuery, buildSearchContent, MIGRATIONS, repeatParams } from "@snort/worker-relay"

/**
 * Bun-native SQLite relay implementing CacheRelay.
 * Reuses query builder and search-index logic from @snort/worker-relay's shared module.
 */
export class BunSqliteRelay implements CacheRelay {
  #db: Database
  #seenInserts = new Set<string>()
  #searchableTagsByKind = new Map<number, Set<string>>()
  #isDumping = false

  static readonly MAX_SEEN_INSERTS = 50_000

  constructor(path: string) {
    const { Database } = require("bun:sqlite") as typeof import("bun:sqlite")
    this.#db = new Database(path, { create: true })
    this.#db.exec("PRAGMA journal_mode = WAL")
    this.#db.exec("PRAGMA synchronous = NORMAL")
    this.#migrate()
  }

  close() {
    if (this.#db) {
      this.#db.close()
    }
  }

  // ---- CacheRelay implementation ----

  async event(ev: TaggedNostrEvent): Promise<OkResponse> {
    if (this.#isDumping) {
      return { ok: false, id: ev.id, relay: "", message: "dumping", event: ev }
    }
    const inserted = this.#insertEvent(ev)
    return {
      ok: true,
      id: ev.id,
      relay: "",
      message: inserted ? undefined : "duplicate",
      event: ev,
    }
  }

  async query(req: ReqCommand): Promise<Array<TaggedNostrEvent>> {
    const filters = req.slice(2) as Array<ReqFilter>
    const ids = new Set<string>()
    const results: Array<TaggedNostrEvent> = []
    for (const filter of filters) {
      const rows = this.#req(filter)
      for (const ev of rows) {
        if (ids.has(ev.id)) continue
        ids.add(ev.id)
        results.push(ev)
      }
    }
    return results
  }

  async delete(req: ReqCommand): Promise<Array<string>> {
    const filters = req.slice(2) as Array<ReqFilter>
    const allIds: Array<string> = []
    for (const filter of filters) {
      const deleted = this.#delete(filter)
      allIds.push(...deleted)
    }
    return allIds
  }

  // ---- Additional methods ----

  count(req: ReqCommand): number {
    const filters = req.slice(2) as Array<ReqFilter>
    let total = 0
    for (const filter of filters) {
      total += this.#count(filter)
    }
    return total
  }

  summary(): Record<string, number> {
    const rows = this.#db.query("select kind, count(*) from events group by kind").all() as Array<{
      kind: number
      "count(*)": number
    }>
    return Object.fromEntries(rows.map(r => [String(r.kind), r["count(*)"]]))
  }

  dump(): Uint8Array {
    if (this.#isDumping) return new Uint8Array()
    this.#isDumping = true
    try {
      return this.#db.serialize()
    } finally {
      this.#isDumping = false
    }
  }

  wipe() {
    this.#db.exec("delete from events")
    this.#db.exec("delete from search_content")
    this.#db.exec("delete from tags")
    this.#seenInserts.clear()
  }

  configureSearchIndex(kindTagsMapping: Record<number, Array<string>>) {
    this.#searchableTagsByKind.clear()
    for (const [kind, tags] of Object.entries(kindTagsMapping)) {
      this.#searchableTagsByKind.set(parseInt(kind, 10), new Set(tags))
    }
  }

  setEventMetadata(id: string, meta: { seen_at?: number }) {
    if (meta.seen_at) {
      this.#db.run("update events set seen_at = ? where id = ?", [meta.seen_at, id])
    }
  }

  batchSetSeenAt(ids: Array<string>, seen_at: number) {
    if (ids.length === 0) return
    this.#db.run(`update events set seen_at = ? where id in (${repeatParams(ids.length)})`, [seen_at, ...ids])
  }

  // ---- Schema & Migrations ----

  #migrate() {
    this.#db.exec(`CREATE TABLE IF NOT EXISTS __migration (version INTEGER PRIMARY KEY, migrated_at INTEGER)`)
    const row = this.#db.query("SELECT MAX(version) as v FROM __migration").get() as { v: number | null }
    let currentVersion = row?.v ?? 0

    for (const { version, sql } of MIGRATIONS) {
      if (currentVersion < version) {
        this.#db.transaction(() => {
          for (const stmt of sql) {
            this.#db.run(stmt, stmt.includes("INSERT INTO __migration") ? [Date.now() / 1000] : [])
          }
          // v3 needs to re-index existing profile events
          if (version === 3) {
            const events = this.#db.query(`SELECT json FROM events WHERE kind IN (0, 1)`).all() as Array<{ json: string }>
            for (const { json } of events) {
              const ev = JSON.parse(json) as TaggedNostrEvent
              this.#insertSearchIndex(ev)
            }
          }
        })()
        currentVersion = version
      }
    }
  }

  // ---- Queries (delegating to shared buildQuery) ----

  #req(filter: ReqFilter): Array<TaggedNostrEvent> {
    const { sql, params } = buildQuery(filter)
    const rows = this.#db.query(sql).all(...(params as [never])) as Array<{ json: string; relays: string | null }>
    return rows.map(row => {
      const ev = JSON.parse(row.json) as TaggedNostrEvent
      ev.relays = row.relays ? row.relays.split(",") : undefined
      return ev
    })
  }

  #count(filter: ReqFilter): number {
    const { sql, params } = buildQuery(filter, { count: true })
    const row = this.#db.query(sql).get(...(params as [never])) as { "count(json)": number } | undefined
    return row?.["count(json)"] ?? 0
  }

  #delete(filter: ReqFilter): Array<string> {
    const { sql, params } = buildQuery(filter, { idsOnly: true })
    const rows = this.#db.query(sql).all(...(params as [never])) as Array<{ id: string }>
    const ids = rows.map(r => r.id)
    if (ids.length > 0) {
      this.#deleteByIds(ids)
    }
    return ids
  }

  #deleteByIds(ids: Array<string>) {
    for (let i = 0; i < ids.length; i += 1000) {
      const batch = ids.slice(i, i + 1000)
      this.#db.run(`DELETE FROM events WHERE id IN (${repeatParams(batch.length)})`, batch)
    }
  }

  // ---- Event Insertion ----

  #insertEvent(ev: TaggedNostrEvent): boolean {
    if (this.#seenInserts.has(ev.id)) return false

    const legacyReplaceableKinds = [0, 3, 41]

    if (ev.kind === 5) {
      const eTags = ev.tags.filter(a => a[0] === "e").map(a => a[1])
      const deletedE = eTags.length > 0
        ? this.#db
            .query(`SELECT id FROM events WHERE id IN (${repeatParams(eTags.length)}) AND pubkey = ?`)
            .all(...eTags, ev.pubkey)
        : []
      const deletedEIds = (deletedE as Array<{ id: string }>).map(r => r.id)
      this.#deleteByIds(deletedEIds)

      let aDeleted = 0
      const aTags = ev.tags.filter(a => a[0] === "a").map(a => a[1])
      for (const t of aTags) {
        const aSplit = t.split(":")
        if (aSplit[1] !== ev.pubkey) continue
        const k = Number(aSplit[0])
        if (Number.isNaN(k)) continue
        const dTagRows = this.#db
          .query(
            `SELECT e.id FROM events e
             JOIN tags t ON e.id = t.event_id
             WHERE e.kind = ? AND e.pubkey = ? AND t.key = 'd' AND t.value = ?`,
          )
          .all(k, ev.pubkey, aSplit[2]) as Array<{ id: string }>
        aDeleted += dTagRows.length
        this.#deleteByIds(dTagRows.map(r => r.id))
      }
      return deletedEIds.length > 0 || aDeleted > 0
    }

    if (legacyReplaceableKinds.includes(ev.kind) || (ev.kind >= 10_000 && ev.kind < 20_000)) {
      const oldRows = this.#db
        .query(`SELECT id FROM events WHERE kind = ? AND pubkey = ? AND created <= ?`)
        .all(ev.kind, ev.pubkey, ev.created_at) as Array<{ id: string }>

      if (oldRows.some(r => r.id === ev.id)) {
        this.#markSeen(ev.id)
        return false
      }
      this.#deleteByIds(oldRows.map(r => r.id))
    }

    if (ev.kind >= 30_000 && ev.kind < 40_000) {
      const dTag = ev.tags.find(a => a[0] === "d")?.[1] ?? ""
      const oldRows = this.#db
        .query(
          `SELECT e.id FROM events e
           JOIN tags t ON e.id = t.event_id
           WHERE e.kind = ? AND e.pubkey = ? AND t.key = 'd' AND t.value = ? AND created <= ?`,
        )
        .all(ev.kind, ev.pubkey, dTag, ev.created_at) as Array<{ id: string }>

      if (oldRows.some(r => r.id === ev.id)) {
        this.#markSeen(ev.id)
        return false
      }
      this.#deleteByIds(oldRows.map(r => r.id))
    }

    const evInsert = { ...ev }
    delete evInsert.relays
    delete evInsert.context

    const insertResult = this.#db.run(
      `INSERT OR IGNORE INTO events (id, pubkey, created, kind, json, relays) VALUES (?, ?, ?, ?, ?, ?)`,
      [ev.id, ev.pubkey, ev.created_at, ev.kind, JSON.stringify(evInsert), (ev.relays ?? []).join(",")],
    )

    if (insertResult.changes > 0) {
      const tagRows = ev.tags.filter(a => a[0].length === 1)
      if (tagRows.length > 0) {
        const placeholders = tagRows.map(() => "(?, ?, ?)").join(", ")
        const tagParams: Array<string> = []
        for (const t of tagRows) {
          tagParams.push(ev.id, t[0], t[1] ?? "")
        }
        this.#db.run(`INSERT INTO tags (event_id, key, value) VALUES ${placeholders}`, tagParams)
      }
      this.#insertSearchIndex(ev)
      this.#markSeen(ev.id)
      return true
    }

    this.#updateRelays(ev)
    this.#markSeen(ev.id)
    return false
  }

  #updateRelays(ev: TaggedNostrEvent) {
    const row = this.#db.query("SELECT relays FROM events WHERE id = ?").get(ev.id) as
      | { relays: string | null }
      | undefined
    const oldRelays = new Set((row?.relays ?? "").split(",").filter(Boolean))
    let hasNew = false
    for (const r of ev.relays ?? []) {
      if (!oldRelays.has(r)) {
        oldRelays.add(r)
        hasNew = true
      }
    }
    if (hasNew) {
      this.#db.run("UPDATE events SET relays = ? WHERE id = ?", [[...oldRelays].join(","), ev.id])
    }
  }

  #insertSearchIndex(ev: TaggedNostrEvent) {
    const content = buildSearchContent(ev as any, this.#searchableTagsByKind)
    if (content.trim().length > 0) {
      this.#db.run("INSERT INTO search_content VALUES (?, ?)", [ev.id, content])
    }
  }

  #markSeen(id: string) {
    if (this.#seenInserts.size >= BunSqliteRelay.MAX_SEEN_INSERTS) {
      this.#seenInserts.clear()
    }
    this.#seenInserts.add(id)
  }
}