import { useSelector } from "react-redux";
import { MetadataCache } from "State/Users";
import type { RootState } from "State/Store";
import { HexKey } from "@snort/nostr";
import { ReduxUDB } from "./Db";

export function useQuery(query: string) {
  // TODO: not observable
  return ReduxUDB.querySync(query);
}

export function useKey(pubKey?: HexKey) {
  const { users } = useSelector((state: RootState) => state.users);
  return pubKey ? users[pubKey] : undefined;
}

export function useKeys(pubKeys?: HexKey[]): Map<HexKey, MetadataCache> {
  const { users } = useSelector((state: RootState) => state.users);
  return new Map((pubKeys ?? []).map(a => [a, users[a]]));
}
