import sqlite3InitModule, { Database, SAHPoolUtil, Sqlite3Static } from "@sqlite.org/sqlite-wasm";
import { EventEmitter } from "eventemitter3";
import { EventMetadata, NostrEvent, RelayHandler, RelayHandlerEvents, ReqFilter, unixNowMs } from "../types";
import migrate from "./migrations";
import { debugLog } from "../debug";

// import wasm file directly, this needs to be copied from https://sqlite.org/download.html
import SqlitePath from "@sqlite.org/sqlite-wasm/sqlite3.wasm?url";
import { runFixers } from "./fixers";

export class SqliteRelay extends EventEmitter<RelayHandlerEvents> implements RelayHandler {
  #sqlite?: Sqlite3Static;
  #log = (msg: string, ...args: Array<any>) => debugLog("SqliteRelay", msg, ...args);
  db?: Database;
  #pool?: SAHPoolUtil;
  #seenInserts = new Set<string>();
  #searchableTagsByKind = new Map<number, Set<string>>();

  /**
   * Configure which event tags should be indexed for full-text search by kind
   */
  configureSearchIndex(kindTagsMapping: Record<number, string[]>) {
    this.#searchableTagsByKind.clear();
    for (const [kind, tags] of Object.entries(kindTagsMapping)) {
      this.#searchableTagsByKind.set(parseInt(kind), new Set(tags));
    }
    this.#log(`Updated searchable tags by kind:`, kindTagsMapping);
  }

  /**
   * Initialize the SQLite driver
   */
  async init(path: string) {
    if (this.#sqlite) return;
    this.#sqlite = await sqlite3InitModule({
      locateFile: (path, prefix) => {
        if (path === "sqlite3.wasm") {
          return SqlitePath;
        }
        return prefix + path;
      },
      print: msg => this.#log(msg),
      printErr: msg => this.#log(msg),
    });
    this.#log(`Got SQLite version: ${this.#sqlite.version.libVersion}`);
    await this.#open(path);
    if (this.db) {
      await migrate(this);
      // don't await to avoid timeout
      runFixers(this);
    }
  }

  /**
   * Open the database from its path
   */
  async #open(path: string) {
    if (!this.#sqlite) throw new Error("Must call init first");
    if (this.db) return;

    this.#pool = await this.#sqlite.installOpfsSAHPoolVfs({});
    this.db = new this.#pool.OpfsSAHPoolDb(path);
    this.#log(`Opened ${this.db.filename}`);
  }

  /**
   * Delete all data
   */
  async wipe() {
    if (this.#pool && this.db) {
      const dbName = this.db.filename;
      this.close();
      await this.#pool.wipeFiles();
      await this.#open(dbName);
      await migrate(this);
    }
  }

  close() {
    this.db?.close();
    this.db = undefined;
  }

  /**
   * Insert an event to the database
   */
  event(ev: NostrEvent) {
    if (this.#insertEvent(this.db!, ev)) {
      this.#log(`Inserted: kind=${ev.kind},authors=${ev.pubkey},id=${ev.id}`);
      this.emit("event", [ev]);
      return true;
    }
    return false;
  }

  sql(sql: string, params: Array<any>) {
    return this.db?.selectArrays(sql, params) as Array<Array<string | number>>;
  }

  /**
   * Write multiple events
   */
  eventBatch(evs: Array<NostrEvent>) {
    const start = unixNowMs();
    let eventsInserted: Array<NostrEvent> = [];
    this.db?.transaction(db => {
      for (const ev of evs) {
        if (this.#insertEvent(db, ev)) {
          eventsInserted.push(ev);
        }
      }
    });
    if (eventsInserted.length > 0) {
      this.#log(`Inserted Batch: ${eventsInserted.length}/${evs.length}, ${(unixNowMs() - start).toLocaleString()}ms`);
      this.emit("event", eventsInserted);
    }
    return eventsInserted.length > 0;
  }

  setEventMetadata(id: string, meta: EventMetadata) {
    if (meta.seen_at) {
      this.db?.exec("update events set seen_at = ? where id = ?", {
        bind: [meta.seen_at, id],
      });
    }
  }

  #deleteById(db: Database, ids: Array<string>) {
    if (ids.length === 0) return;
    db.exec(`delete from events where id in (${this.#repeatParams(ids.length)})`, {
      bind: ids,
    });
    const deleted = db.changes();
    db.exec(`delete from search_content where id in (${this.#repeatParams(ids.length)})`, {
      bind: ids,
    });
    this.#log("Deleted", ids, deleted);
  }

  #insertEvent(db: Database, ev: NostrEvent) {
    if (this.#seenInserts.has(ev.id)) return false;

    const legacyReplaceableKinds = [0, 3, 41];

    // handle deletes
    if (ev.kind === 5) {
      // delete using a request filter, take e/a tags for making a filter
      const eTags = ev.tags.filter(a => a[0] === "e").map(a => a[1]);
      const deletedE = this.delete({
        ids: eTags,
        authors: [ev.pubkey],
      });

      // a tags are harder to delete, just delete one-by-one to avoid multiple authors/kinds
      let aDeleted = 0;
      const aTags = ev.tags.filter(a => a[0] === "a").map(a => a[1]);
      for (const t in aTags) {
        const aSplit = t.split(":");
        // check if the event author is the author of the a tag
        if (aSplit[1] !== ev.pubkey) {
          this.#log("Skipping delete request for %s from %s, pubkey doesnt match", t, ev.pubkey);
          continue;
        }
        const k = Number(aSplit[0]);
        if (isNaN(k)) {
          continue;
        }
        aDeleted += this.delete({
          authors: [ev.pubkey],
          kinds: [k],
          ["#d"]: [aSplit[2]],
        }).length;
      }
      return deletedE.length > 0 || aDeleted > 0;
    }

    // Handle legacy and standard replaceable events (kinds 0, 3, 41, 10000-19999)
    if (legacyReplaceableKinds.includes(ev.kind) || (ev.kind >= 10_000 && ev.kind < 20_000)) {
      const oldEvents = db.selectValues(`SELECT id FROM events WHERE kind = ? AND pubkey = ? AND created <= ?`, [
        ev.kind,
        ev.pubkey,
        ev.created_at,
      ]) as Array<string>;

      if (oldEvents.includes(ev.id)) {
        // Already have this event
        this.#seenInserts.add(ev.id);
        return false;
      } else {
        // Delete older events of the same kind and pubkey
        this.#deleteById(db, oldEvents);
      }
    }

    // Handle parameterized replaceable events (kinds 30000-39999)
    if (ev.kind >= 30_000 && ev.kind < 40_000) {
      const dTag = ev.tags.find(a => a[0] === "d")?.[1] ?? "";

      const oldEvents = db.selectValues(
        `SELECT e.id
         FROM events e
         JOIN tags t ON e.id = t.event_id
         WHERE e.kind = ? AND e.pubkey = ? AND t.key = ? AND t.value = ? AND created <= ?`,
        [ev.kind, ev.pubkey, "d", dTag, ev.created_at],
      ) as Array<string>;

      if (oldEvents.includes(ev.id)) {
        // Already have this event
        this.#seenInserts.add(ev.id);
        return false;
      } else {
        // Delete older events with the same kind, pubkey, and d tag
        this.#deleteById(db, oldEvents);
      }
    }

    // Proceed to insert the new event
    const evInsert = { ...ev };
    delete evInsert["relays"]; // Remove non-DB fields

    db.exec(
      `INSERT OR IGNORE INTO events(id, pubkey, created, kind, json, relays) 
       VALUES(?,?,?,?,?,?)`,
      {
        bind: [ev.id, ev.pubkey, ev.created_at, ev.kind, JSON.stringify(evInsert), (ev.relays ?? []).join(",")],
      },
    );

    const insertedEvents = db.changes();
    if (insertedEvents > 0) {
      // Insert tags
      for (const t of ev.tags.filter(a => a[0].length === 1)) {
        db.exec("INSERT INTO tags(event_id, key, value) VALUES(?, ?, ?)", {
          bind: [ev.id, t[0], t[1]],
        });
      }
      this.insertIntoSearchIndex(db, ev);
    } else {
      this.#updateRelays(db, ev);
      return false;
    }

    this.#seenInserts.add(ev.id);
    return true;
  }

  /**
   * Append relays
   */
  #updateRelays(db: Database, ev: NostrEvent) {
    const relays = db.selectArrays("select relays from events where id = ?", [ev.id]);
    const oldRelays = new Set((relays?.at(0)?.at(0) as string | null)?.split(",") ?? []);
    let hasNew = false;
    for (const r of ev.relays ?? []) {
      if (!oldRelays.has(r)) {
        oldRelays.add(r);
        hasNew = true;
      }
    }
    if (hasNew) {
      db.exec("update events set relays = ? where id = ?", {
        bind: [[...oldRelays].join(","), ev.id],
      });
    }
  }

  /**
   * Query relay by nostr filter
   */
  req(id: string, req: ReqFilter) {
    const start = unixNowMs();

    const [sql, params] = this.#buildQuery(req);
    const res = this.db?.selectArrays(sql, params);
    const results =
      res?.map(a => {
        if (req.ids_only === true) {
          return a[0] as string;
        }
        const ev = JSON.parse(a[0] as string) as NostrEvent;
        return {
          ...ev,
          relays: (a[1] as string | null)?.split(","),
        };
      }) ?? [];
    const time = unixNowMs() - start;
    this.#log(`Query ${id} results took ${time.toLocaleString()}ms`, req);
    return results;
  }

  /**
   * Count results by nostr filter
   */
  count(req: ReqFilter) {
    const start = unixNowMs();
    const [sql, params] = this.#buildQuery(req, true);
    const rows = this.db?.exec(sql, {
      bind: params,
      returnValue: "resultRows",
    });
    const results = (rows?.at(0)?.at(0) as number | undefined) ?? 0;
    const time = unixNowMs() - start;
    this.#log(`Query count results took ${time.toLocaleString()}ms`);
    return results;
  }

  /**
   * Delete events by nostr filter
   */
  delete(req: ReqFilter) {
    this.#log(`Starting delete of ${JSON.stringify(req)}`);
    const start = unixNowMs();
    const for_delete = this.req("ids-for-delete", { ...req, ids_only: true }) as Array<string>;

    const grouped = for_delete.reduce(
      (acc, v, i) => {
        const batch = (i / 1000).toFixed(0);
        acc[batch] ??= [];
        acc[batch].push(v);
        return acc;
      },
      {} as Record<string, Array<string>>,
    );
    this.#log(`Starting delete of ${Object.keys(grouped).length} batches`);
    Object.entries(grouped).forEach(([batch, ids]) => {
      this.#deleteById(this.db!, ids);
    });
    const time = unixNowMs() - start;
    this.#log(`Delete ${for_delete.length} events took ${time.toLocaleString()}ms`);
    return for_delete;
  }

  /**
   * Get a summary about events table
   */
  summary() {
    const res = this.db?.exec("select kind, count(*) from events group by kind", {
      returnValue: "resultRows",
    });
    return Object.fromEntries(res?.map(a => [String(a[0]), a[1] as number]) ?? []);
  }

  /**
   * Dump the database file
   */
  async dump() {
    const filePath = String(this.db?.filename ?? "");
    if (this.db && this.#pool) {
      try {
        return await this.#pool.exportFile(`/${filePath}`);
      } catch (e) {
        console.error(e);
      } finally {
        await this.#open(filePath);
      }
    }
    return new Uint8Array();
  }

  #buildQuery(req: ReqFilter, count = false, remove = false): [string, Array<any>] {
    const conditions: Array<string> = [];
    const params: Array<any> = [];

    let resultType = "json,relays";
    if (count) {
      resultType = "count(json)";
    } else if (req.ids_only === true) {
      resultType = "id";
    }
    let operation = `select ${resultType}`;
    if (remove) {
      operation = "delete";
    }
    let sql = `${operation} from events`;
    const orTags = Object.entries(req).filter(([k]) => k.startsWith("#"));
    let tx = 0;
    for (const [key, values] of orTags) {
      const vArray = values as Array<string>;
      sql += ` inner join tags t_${tx} on events.id = t_${tx}.event_id and t_${tx}.key = ? and t_${tx}.value in (${this.#repeatParams(
        vArray.length,
      )})`;
      params.push(key.slice(1));
      params.push(...vArray);
      tx++;
    }
    if (req.search) {
      sql += " inner join search_content on search_content.id = events.id";
      conditions.push("search_content match ?");
      params.push(req.search.replaceAll(".", "+").replaceAll("@", "+"));
    }
    if (req.ids) {
      conditions.push(`id in (${this.#repeatParams(req.ids.length)})`);
      params.push(...req.ids);
    }
    if (req.authors) {
      conditions.push(`pubkey in (${this.#repeatParams(req.authors.length)})`);
      params.push(...req.authors);
    }
    if (req.kinds) {
      conditions.push(`kind in (${this.#repeatParams(req.kinds.length)})`);
      params.push(...req.kinds);
    }
    if (req.since) {
      conditions.push("created >= ?");
      params.push(req.since);
    }
    if (req.until) {
      conditions.push("created < ?");
      params.push(req.until);
    }
    if (conditions.length > 0) {
      sql += ` where ${conditions.join(" and ")}`;
    }
    if (req.limit) {
      sql += ` order by created desc limit ${req.limit}`;
    }
    return [sql, params];
  }

  #repeatParams(n: number) {
    const ret: Array<string> = [];
    for (let x = 0; x < n; x++) {
      ret.push("?");
    }
    return ret.join(", ");
  }

  #replaceParamsDebug(sql: string, params: Array<number | string>) {
    let res = "";
    let cIdx = 0;
    for (const chr of sql) {
      if (chr === "?") {
        const px = params[cIdx++];
        if (typeof px === "number") {
          res += px.toString();
        } else if (typeof px === "string") {
          res += `'${px}'`;
        }
      } else {
        res += chr;
      }
    }
    return res;
  }

  insertIntoSearchIndex(db: Database, ev: NostrEvent) {
    let indexContent = "";
    let shouldIndex = false;

    // always index profiles
    if (ev.kind === 0) {
      shouldIndex = true;
      const profile = JSON.parse(ev.content) as {
        name?: string;
        display_name?: string;
        lud16?: string;
        nip05?: string;
        website?: string;
        about?: string;
      };
      if (profile) {
        indexContent = [
          profile.name,
          profile.display_name,
          profile.about,
          profile.website,
          profile.lud16,
          profile.nip05,
        ].join(" ");
      }
    }

    // Check if this event kind has configured searchable tags
    const searchableTags = this.#searchableTagsByKind.get(ev.kind);
    let searchableTagContent = "";

    if (searchableTags) {
      shouldIndex = true;
      searchableTagContent = ev.tags
        .filter(tag => tag.length >= 2 && searchableTags.has(tag[0]))
        .map(tag => tag[1])
        .filter(value => value && value.trim().length > 0)
        .join(" ");
    }

    if (shouldIndex) {
      // Always include content + any searchable tag content
      let fullContent = [ev.content, indexContent, searchableTagContent]
        .filter(content => content && content.trim().length > 0)
        .join(" ");

      if (fullContent.trim().length > 0) {
        db.exec("insert into search_content values(?,?)", {
          bind: [ev.id, fullContent],
        });
      }
    }
  }

  #fixMissingTags(db: Database) {}
}
