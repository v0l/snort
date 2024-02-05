import { NostrEvent } from "./types";
import { SqliteRelay } from "./sqlite-relay";
import debug from "debug";

const log = debug("SqliteRelay:migrations");

/**
 * Do database migration
 */
function migrate(relay: SqliteRelay) {
  if (!relay.db) throw new Error("DB must be open");

  relay.db.exec(
    'CREATE TABLE IF NOT EXISTS "__migration" (version INTEGER,migrated NUMERIC, CONSTRAINT "__migration_PK" PRIMARY KEY (version))',
  );
  const res = relay.db.exec("select max(version) from __migration", {
    returnValue: "resultRows",
  });

  const version = (res[0][0] as number | undefined) ?? 0;
  log(`Starting migration from: v${version}`);
  if (version < 1) {
    migrate_v1(relay);
    log("Migrated to v1");
  }
  if (version < 2) {
    migrate_v2(relay);
    log("Migrated to v2");
  }
  if (version < 3) {
    migrate_v3(relay);
    log("Migrated to v3");
  }
  if (version < 4) {
    migrate_v4(relay);
    log("Migrated to v4");
  }
}

function migrate_v1(relay: SqliteRelay) {
  relay.db?.transaction(db => {
    db.exec(
      "CREATE TABLE events (\
      id TEXT(64) PRIMARY KEY, \
      pubkey TEXT(64), \
      created INTEGER, \
      kind INTEGER, \
      json TEXT \
    )",
    );
    db.exec(
      "CREATE TABLE tags (\
      event_id TEXT(64), \
      key TEXT, \
      value TEXT, \
      CONSTRAINT tags_FK FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE \
      )",
    );
    db.exec("CREATE INDEX tags_key_IDX ON tags (key,value)");
    db.exec("insert into __migration values(1, ?)", {
      bind: [new Date().getTime() / 1000],
    });
  });
}

function migrate_v2(relay: SqliteRelay) {
  relay.db?.transaction(db => {
    db.exec("CREATE INDEX pubkey_kind_IDX ON events (pubkey,kind)");
    db.exec("CREATE INDEX pubkey_created_IDX ON events (pubkey,created)");
    db.exec("insert into __migration values(2, ?)", {
      bind: [new Date().getTime() / 1000],
    });
  });
}

function migrate_v3(relay: SqliteRelay) {
  relay.db?.transaction(db => {
    db.exec("CREATE VIRTUAL TABLE search_content using fts5(id UNINDEXED, content)");
    const events = db.selectArrays("select json from events where kind in (?,?)", [0, 1]);
    for (const json of events) {
      const ev = JSON.parse(json[0] as string) as NostrEvent;
      if (ev) {
        relay.insertIntoSearchIndex(db, ev);
      }
    }
    db.exec("insert into __migration values(3, ?)", {
      bind: [new Date().getTime() / 1000],
    });
  });
}

async function migrate_v4(relay: SqliteRelay) {
  relay.db?.transaction(db => {
    db.exec("ALTER TABLE events ADD COLUMN seen_at INTEGER");
    db.exec("insert into __migration values(4, ?)", {
      bind: [new Date().getTime() / 1000],
    });
  });
}

export default migrate;
