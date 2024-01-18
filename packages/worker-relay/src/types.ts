export interface WorkerMessage<T> {
  id: string;
  cmd: "reply" | "init" | "open" | "migrate" | "event" | "req" | "count" | "summary" | "close" | "dumpDb" | "sql";
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
}

export interface ReqCommand {
  id: string;
  filters: Array<ReqFilter>;
  leaveOpen?: boolean;
}

export interface ReqFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  search?: string;
  since?: number;
  until?: number;
  limit?: number;
  not?: ReqFilter;
  [key: string]: Array<string> | Array<number> | string | number | undefined | ReqFilter;
}

export function unixNowMs() {
  return new Date().getTime();
}
