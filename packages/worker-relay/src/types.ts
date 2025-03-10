import { EventEmitter } from "eventemitter3";

export type WorkerMessageCommand =
  | "reply"
  | "init"
  | "event"
  | "req"
  | "count"
  | "summary"
  | "close"
  | "dumpDb"
  | "emit-event"
  | "forYouFeed"
  | "setEventMetadata"
  | "debug"
  | "delete"
  | "wipe";

export interface WorkerMessage<T> {
  id: string;
  cmd: WorkerMessageCommand;
  args: T;
}

export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: Array<Array<string>>;
  content: string;
  sig: string;
  relays?: Array<string>;
}

export interface EventMetadata {
  seen_at?: number;
}

export type ReqCommand = ["REQ", id: string, ...filters: Array<ReqFilter>];

export interface ReqFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  search?: string;
  since?: number;
  until?: number;
  limit?: number;
  [key: string]: Array<string> | Array<number> | string | number | undefined | boolean;
}

export interface OkResponse {
  ok: boolean;
  id: string;
  relay: string;
  message?: string;
  event: NostrEvent;
}

export interface RelayHandler extends EventEmitter<RelayHandlerEvents> {
  init(path: string, path2Wasm?: string): Promise<void>;
  close(): void;
  event(ev: NostrEvent): boolean;
  eventBatch(evs: Array<NostrEvent>): boolean;

  /**
   * Run any SQL command
   */
  sql(sql: string, params: Array<string | number>): Array<Array<string | number>>;
  req(id: string, req: ReqFilter): Array<NostrEvent | string>;
  count(req: ReqFilter): number;
  summary(): Record<string, number>;
  dump(): Promise<Uint8Array>;
  delete(req: ReqFilter): Array<string>;
  setEventMetadata(id: string, meta: EventMetadata): void;
  wipe(): Promise<void>;
}

export interface RelayHandlerEvents {
  event: (evs: Array<NostrEvent>) => void;
}

export function unixNowMs() {
  return new Date().getTime();
}

export function eventMatchesFilter(ev: NostrEvent, filter: ReqFilter) {
  if (filter.since && ev.created_at < filter.since) {
    return false;
  }
  if (filter.until && ev.created_at > filter.until) {
    return false;
  }
  if (!(filter.ids?.includes(ev.id) ?? true)) {
    return false;
  }
  if (!(filter.authors?.includes(ev.pubkey) ?? true)) {
    return false;
  }
  if (!(filter.kinds?.includes(ev.kind) ?? true)) {
    return false;
  }
  const orTags = Object.entries(filter).filter(([k]) => k.startsWith("#"));
  for (const [k, v] of orTags) {
    const vargs = v as Array<string>;
    for (const x of vargs) {
      if (!ev.tags.find(a => a[0] === k.slice(1) && a[1] === x)) {
        return false;
      }
    }
  }
  const andTags = Object.entries(filter).filter(([k]) => k.startsWith("&"));
  for (const [k, v] of andTags) {
    const vargs = v as Array<string>;
    const allMatch = vargs.every(x => ev.tags.some(tag => tag[0] === k.slice(1) && tag[1] === x));
    if (!allMatch) {
      return false;
    }
  }

  return true;
}
