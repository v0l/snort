import type { NostrEvent, ReqFilter } from "../types"

/**
 * Shared pure functions used by both SqliteRelay (WASM) and BunSqliteRelay.
 * No DB or platform imports — only type imports from types.ts.
 */

export function repeatParams(n: number): string {
  return Array.from({ length: n }, () => "?").join(", ")
}

export interface BuildQueryOpts {
  count?: boolean
  idsOnly?: boolean
}

export interface BuildQueryResult {
  sql: string
  params: Array<string | number>
}

/**
 * Build a SQL query from a nostr REQ filter.
 * Supports # tags (OR via INNER JOIN) and & tags (AND via EXISTS subquery).
 */
export function buildQuery(req: ReqFilter, opts?: BuildQueryOpts): BuildQueryResult {
  const params: Array<string | number> = []

  const resultType = opts?.count ? "count(json)" : opts?.idsOnly ? "id" : "json, relays"
  let sql = `select ${resultType} from events`

  const orTags = Object.entries(req).filter(([k]) => k.startsWith("#"))
  for (let i = 0; i < orTags.length; i++) {
    const [key, values] = orTags[i] as [string, Array<string>]
    const placeholders = repeatParams(values.length)
    sql += ` inner join tags t_${i} on events.id = t_${i}.event_id and t_${i}.key = ? and t_${i}.value in (${placeholders})`
    params.push(key.slice(1))
    params.push(...values)
  }

  const andTags = Object.entries(req).filter(([k]) => k.startsWith("&"))
  for (const [key, values] of andTags) {
    const vArray = values as Array<string>
    for (const v of vArray) {
      sql += ` and exists (select 1 from tags where tags.event_id = events.id and tags.key = ? and tags.value = ?)`
      params.push(key.slice(1), v)
    }
  }

  const conditions: Array<string> = []

  if (req.search) {
    sql += " inner join search_content on search_content.id = events.id"
    conditions.push("search_content match ?")
    params.push(req.search.replaceAll(".", "+").replaceAll("@", "+"))
  }
  if (req.ids) {
    conditions.push(`id in (${repeatParams(req.ids.length)})`)
    params.push(...req.ids)
  }
  if (req.authors) {
    conditions.push(`pubkey in (${repeatParams(req.authors.length)})`)
    params.push(...req.authors)
  }
  if (req.kinds) {
    conditions.push(`kind in (${repeatParams(req.kinds.length)})`)
    params.push(...req.kinds)
  }
  if (req.since) {
    conditions.push("created >= ?")
    params.push(req.since)
  }
  if (req.until) {
    conditions.push("created < ?")
    params.push(req.until)
  }

  if (conditions.length > 0) {
    sql += ` where ${conditions.join(" and ")}`
  }
  sql += " order by created desc"
  if (req.limit) {
    sql += ` limit ${req.limit}`
  }
  return { sql, params }
}

/**
 * Build the search index content string for an event.
 * Returns empty string if the event should not be indexed.
 */
export function buildSearchContent(
  ev: NostrEvent,
  searchableTagsByKind: Map<number, Set<string>>,
): string {
  const parts: Array<string> = []

  // Kind 0 profiles: index display fields
  if (ev.kind === 0) {
    try {
      const profile = JSON.parse(ev.content) as {
        name?: string
        display_name?: string
        lud16?: string
        nip05?: string
        website?: string
        about?: string
      }
      parts.push(
        ...[profile.name, profile.display_name, profile.about, profile.website, profile.lud16, profile.nip05].filter(
          (s): s is string => typeof s === "string",
        ),
      )
    } catch {
      // ignore parse errors
    }
  }

  // Always include event content
  if (ev.content?.trim()) {
    parts.push(ev.content)
  }

  // Searchable tags by kind
  const searchableTags = searchableTagsByKind.get(ev.kind)
  if (searchableTags) {
    const tagValues = ev.tags
      .filter(tag => tag.length >= 2 && searchableTags.has(tag[0]))
      .map(tag => tag[1])
      .filter(value => value && value.trim().length > 0)
    parts.push(...tagValues)
  }

  return parts.filter(s => s && s.trim().length > 0).join(" ")
}

// ---- Migration DDL ----

/**
 * Each migration has a version number and SQL statements to run.
 * The DDL is shared between WASM (worker-relay) and Bun (bun-sqlite-relay) backends.
 */
export interface Migration {
  version: number
  sql: Array<string>
}

/**
 * All migrations in order. Version 0 is the initial schema check.
 * SQL statements use ?-style params; implementations should bind [unixepoch()] or similar
 * for the migrated_at column.
 */
export const MIGRATIONS: Array<Migration> = [
  {
    version: 1,
    sql: [
      `CREATE TABLE events (
        id TEXT(64) PRIMARY KEY,
        pubkey TEXT(64),
        created INTEGER,
        kind INTEGER,
        json TEXT
      )`,
      `CREATE TABLE tags (
        event_id TEXT(64),
        key TEXT,
        value TEXT,
        CONSTRAINT tags_FK FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX tags_key_IDX ON tags (key, value)`,
      `INSERT INTO __migration VALUES (1, ?)`,
    ],
  },
  {
    version: 2,
    sql: [
      `CREATE INDEX pubkey_kind_IDX ON events (pubkey, kind)`,
      `CREATE INDEX pubkey_created_IDX ON events (pubkey, created)`,
      `INSERT INTO __migration VALUES (2, ?)`,
    ],
  },
  {
    version: 3,
    sql: [
      `CREATE VIRTUAL TABLE search_content USING fts5(id UNINDEXED, content)`,
      `INSERT INTO __migration VALUES (3, ?)`,
    ],
  },
  {
    version: 4,
    sql: [
      `ALTER TABLE events ADD COLUMN seen_at INTEGER`,
      `INSERT INTO __migration VALUES (4, ?)`,
    ],
  },
  {
    version: 5,
    sql: [
      `CREATE INDEX seen_at_IDX ON events (seen_at)`,
      `INSERT INTO __migration VALUES (5, ?)`,
    ],
  },
  {
    version: 6,
    sql: [
      `ALTER TABLE events ADD COLUMN relays TEXT`,
      `INSERT INTO __migration VALUES (6, ?)`,
    ],
  },
  {
    version: 7,
    sql: [
      `CREATE INDEX kind_created_IDX ON events (kind, created DESC)`,
      `DROP INDEX IF EXISTS pubkey_kind_IDX`,
      `DROP INDEX IF EXISTS pubkey_created_IDX`,
      `CREATE INDEX pubkey_kind_created_IDX ON events (pubkey, kind, created DESC)`,
      `CREATE INDEX tags_event_id_IDX ON tags (event_id)`,
      `INSERT INTO __migration VALUES (7, ?)`,
    ],
  },
]