import { useState, useMemo, ChangeEvent } from "react";
import { useSelector } from "react-redux";
import { FormattedMessage } from "react-intl";
import { EventKind, HexKey, TaggedRawEvent } from "@snort/nostr";

import Note from "Element/Note";
import { RootState } from "State/Store";
import { UserCache } from "Cache/UserCache";

import messages from "./messages";
interface BookmarksProps {
  pubkey: HexKey;
  bookmarks: readonly TaggedRawEvent[];
  related: readonly TaggedRawEvent[];
}

const Bookmarks = ({ pubkey, bookmarks, related }: BookmarksProps) => {
  const [onlyPubkey, setOnlyPubkey] = useState<HexKey | "all">("all");
  const loginPubKey = useSelector((s: RootState) => s.login.publicKey);
  const ps = useMemo(() => {
    return [...new Set(bookmarks.map(ev => ev.pubkey))];
  }, [bookmarks]);

  function renderOption(p: HexKey) {
    const profile = UserCache.getFromCache(p);
    return profile ? <option value={p}>{profile?.display_name || profile?.name}</option> : null;
  }

  return (
    <div className="main-content">
      <div className="mb10 flex-end">
        <select
          disabled={ps.length <= 1}
          value={onlyPubkey}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setOnlyPubkey(e.target.value)}>
          <option value="all">
            <FormattedMessage {...messages.All} />
          </option>
          {ps.map(renderOption)}
        </select>
      </div>
      {bookmarks
        .filter(b => (onlyPubkey === "all" ? true : b.pubkey === onlyPubkey))
        .map(n => {
          return (
            <Note
              key={n.id}
              data={n}
              related={related}
              options={{ showTime: false, showBookmarked: true, canUnbookmark: loginPubKey === pubkey }}
            />
          );
        })}
    </div>
  );
};

export default Bookmarks;
