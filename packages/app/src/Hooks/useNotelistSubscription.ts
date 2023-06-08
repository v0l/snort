import { useMemo } from "react";
import {
  HexKey,
  Lists,
  EventKind,
  FlatNoteStore,
  ParameterizedReplaceableNoteStore,
  RequestBuilder,
} from "@snort/system";

import useRequestBuilder from "Hooks/useRequestBuilder";
import useLogin from "Hooks/useLogin";

export default function useNotelistSubscription(pubkey: HexKey | undefined, l: Lists, defaultIds: HexKey[]) {
  const { preferences, publicKey } = useLogin();
  const isMe = publicKey === pubkey;

  const sub = useMemo(() => {
    if (isMe || !pubkey) return null;
    const rb = new RequestBuilder(`note-list-${l}:${pubkey.slice(0, 12)}`);
    rb.withFilter().kinds([EventKind.NoteLists]).authors([pubkey]).tag("d", [l]).limit(1);

    return rb;
  }, [pubkey]);

  const listStore = useRequestBuilder<ParameterizedReplaceableNoteStore>(ParameterizedReplaceableNoteStore, sub);
  const etags = useMemo(() => {
    if (isMe) return defaultIds;
    // there should only be a single event here because we only load 1 pubkey
    if (listStore.data && listStore.data.length > 0) {
      return listStore.data[0].tags.filter(a => a[0] === "e").map(a => a[1]);
    }
    return [];
  }, [listStore.data, isMe, defaultIds]);

  const esub = useMemo(() => {
    if (!pubkey || etags.length === 0) return null;
    const s = new RequestBuilder(`${l}-notes:${pubkey.slice(0, 12)}`);
    s.withFilter().kinds([EventKind.TextNote]).ids(etags);
    if (etags.length > 0 && preferences.enableReactions) {
      s.withFilter()
        .kinds([EventKind.Reaction, EventKind.Repost, EventKind.Deletion, EventKind.ZapReceipt])
        .tag("e", etags);
    }
    return s;
  }, [etags, pubkey, preferences]);

  const store = useRequestBuilder<FlatNoteStore>(FlatNoteStore, esub);

  return store.data ?? [];
}
