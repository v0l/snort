import { AuthHandler, Connection, RelaySettings, ConnectionStateSnapshot } from "./Connection";
import { RequestBuilder } from "./RequestBuilder";
import { EventBuilder } from "./EventBuilder";
import {
  FlatNoteStore,
  NoteStore,
  PubkeyReplaceableNoteStore,
  ParameterizedReplaceableNoteStore,
  ReplaceableNoteStore,
} from "./NoteCollection";
import { Query } from "./Query";
import { NostrEvent, ReqFilter } from "./Nostr";

export * from "./NostrSystem";
export { default as EventKind } from "./EventKind";
export * from "./Nostr";
export * from "./Links";
export { default as Tag } from "./Tag";
export * from "./Nips";
export * from "./RelayInfo";

export interface SystemInterface {
  /**
   * Handler function for NIP-42
   */
  HandleAuth?: AuthHandler;
  get Sockets(): Array<ConnectionStateSnapshot>;
  GetQuery(id: string): Query | undefined;
  Query<T extends NoteStore>(type: { new (): T }, req: RequestBuilder | null): Query | undefined;
  ConnectToRelay(address: string, options: RelaySettings): Promise<void>;
  DisconnectRelay(address: string): void;
  BroadcastEvent(ev: NostrEvent): void;
  WriteOnceToRelay(relay: string, ev: NostrEvent): Promise<void>;
}

export interface SystemSnapshot {
  queries: Array<{
    id: string;
    filters: Array<ReqFilter>;
    subFilters: Array<ReqFilter>;
    closing: boolean;
  }>;
}

export {
  NoteStore,
  RequestBuilder,
  FlatNoteStore,
  PubkeyReplaceableNoteStore,
  ParameterizedReplaceableNoteStore,
  ReplaceableNoteStore,
  Query,
  EventBuilder,
  AuthHandler,
  Connection,
  RelaySettings,
  ConnectionStateSnapshot,
};
