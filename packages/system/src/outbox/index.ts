import { SystemInterface, UsersRelays } from "..";

export const DefaultPickNRelays = 2;

export interface AuthorsRelaysCache {
  getFromCache(pubkey?: string): UsersRelays | undefined;
  update(obj: UsersRelays): Promise<"new" | "updated" | "refresh" | "no_change">;
  buffer(keys: Array<string>): Promise<Array<string>>;
  bulkSet(objs: Array<UsersRelays>): Promise<void>;
}

export interface PickedRelays {
  key: string;
  relays: Array<string>;
}

export type EventFetcher = {
  Fetch: SystemInterface["Fetch"];
};

export * from "./outbox-model";
export * from "./relay-loader";
