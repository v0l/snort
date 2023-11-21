import { useState, useMemo, ChangeEvent } from "react";
import { FormattedMessage } from "react-intl";
import { HexKey, TaggedNostrEvent } from "@snort/system";

import Note from "@/Element/Event/Note";
import useLogin from "@/Hooks/useLogin";
import { UserCache } from "@/Cache";

import messages from "../messages";

interface BookmarksProps {
  pubkey: HexKey;
  bookmarks: readonly TaggedNostrEvent[];
  related: readonly TaggedNostrEvent[];
}

const Bookmarks = ({ pubkey, bookmarks, related }: BookmarksProps) => {
  const [onlyPubkey, setOnlyPubkey] = useState<HexKey | "all">("all");
  const { publicKey } = useLogin(s => ({ publicKey: s.publicKey }));
  const ps = useMemo(() => {
    return [...new Set(bookmarks.map(ev => ev.pubkey))];
  }, [bookmarks]);

  function renderOption(p: HexKey) {
    const profile = UserCache.getFromCache(p);
    return profile ? <option value={p}>{profile?.display_name || profile?.name}</option> : null;
  }

  return (
    <>
      <div className="flex-end p">
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
              options={{ showTime: false, showBookmarked: true, canUnbookmark: publicKey === pubkey }}
            />
          );
        })}
    </>
  );
};

export default Bookmarks;
