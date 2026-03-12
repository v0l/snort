import { debugLog } from '../debug'
import type { NostrEvent } from '../types'
import type { SqliteRelay } from './sqlite-relay'

const log = (msg: string, ...args: Array<any>) => debugLog('SqliteRelay:migrations', msg, ...args)

const migrations = [
  { version: 1, script: migrate_v1 },
  { version: 2, script: migrate_v2 },
  { version: 3, script: migrate_v3 },
  { version: 4, script: migrate_v4 },
  { version: 5, script: migrate_v5 },
  { version: 6, script: migrate_v6 },
  { version: 7, script: migrate_v7 },
]

async function migrate(relay: SqliteRelay) {
  if (!relay.db) throw new Error('DB must be open')

  relay.db.exec(
    'CREATE TABLE IF NOT EXISTS __migration (\
    version INTEGER PRIMARY KEY, \
    migrated_at INTEGER \
  )',
  )
  const res = relay.db.exec('SELECT MAX(version) FROM __migration', { returnValue: 'resultRows' })
  let currentVersion = (res[0][0] as number | undefined) ?? 0

  for (const { version, script } of migrations) {
    if (currentVersion < version) {
      log(`Migrating to v${version}`)
      await script(relay)
      currentVersion = version
    }
  }
}

function migrate_v1(relay: SqliteRelay) {
  return relay.db?.transaction(db => {
    db.exec(
      'CREATE TABLE events (\
      id TEXT(64) PRIMARY KEY, \
      pubkey TEXT(64), \
      created INTEGER, \
      kind INTEGER, \
      json TEXT \
    )',
    )
    db.exec(
      'CREATE TABLE tags (\
      event_id TEXT(64), \
      key TEXT, \
      value TEXT, \
      CONSTRAINT tags_FK FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE \
      )',
    )
    db.exec('CREATE INDEX tags_key_IDX ON tags (key,value)')
    db.exec('insert into __migration values(1, ?)', {
      bind: [Date.now()/ 1000],
    })
  })
}

function migrate_v2(relay: SqliteRelay) {
  relay.db?.transaction(db => {
    db.exec('CREATE INDEX pubkey_kind_IDX ON events (pubkey,kind)')
    db.exec('CREATE INDEX pubkey_created_IDX ON events (pubkey,created)')
    db.exec('insert into __migration values(2, ?)', {
      bind: [Date.now()/ 1000],
    })
  })
}

function migrate_v3(relay: SqliteRelay) {
  relay.db?.transaction(db => {
    db.exec('CREATE VIRTUAL TABLE search_content using fts5(id UNINDEXED, content)')
    const events = db.selectArrays('select json from events where kind in (?,?)', [0, 1])
    for (const json of events) {
      const ev = JSON.parse(json[0] as string) as NostrEvent
      if (ev) {
        relay.insertIntoSearchIndex(db, ev)
      }
    }
    db.exec('insert into __migration values(3, ?)', {
      bind: [Date.now()/ 1000],
    })
  })
}

async function migrate_v4(relay: SqliteRelay) {
  relay.db?.transaction(db => {
    db.exec('ALTER TABLE events ADD COLUMN seen_at INTEGER')
    db.exec('insert into __migration values(4, ?)', {
      bind: [Date.now()/ 1000],
    })
  })
}

async function migrate_v5(relay: SqliteRelay) {
  relay.db?.transaction(db => {
    db.exec('CREATE INDEX seen_at_IDX ON events (seen_at)')
    db.exec('insert into __migration values(5, ?)', {
      bind: [Date.now()/ 1000],
    })
  })
}

async function migrate_v6(relay: SqliteRelay) {
  relay.db?.transaction(db => {
    db.exec('ALTER TABLE events ADD COLUMN relays TEXT')
    db.exec('insert into __migration values(6, ?)', {
      bind: [Date.now()/ 1000],
    })
  })
}

async function migrate_v7(relay: SqliteRelay) {
  relay.db?.transaction(db => {
    // Composite (kind, created) index: covers kind-only filters with ORDER BY created DESC
    db.exec('CREATE INDEX kind_created_IDX ON events (kind, created DESC)')
    // Composite (pubkey, kind, created) covering index replaces the two narrower indexes
    db.exec('DROP INDEX IF EXISTS pubkey_kind_IDX')
    db.exec('DROP INDEX IF EXISTS pubkey_created_IDX')
    db.exec('CREATE INDEX pubkey_kind_created_IDX ON events (pubkey, kind, created DESC)')
    // Index on tags.event_id: fixes O(n) full-table scans on FK cascade deletes and parameterized-replaceable JOINs
    db.exec('CREATE INDEX tags_event_id_IDX ON tags (event_id)')
    db.exec('insert into __migration values(7, ?)', {
      bind: [Date.now()/ 1000],
    })
  })
}

export default migrate
