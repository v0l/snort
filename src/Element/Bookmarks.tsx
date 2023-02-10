import { useState, useMemo, ChangeEvent } from "react";
import { useSelector } from "react-redux";
import { FormattedMessage } from "react-intl";

import Note from "Element/Note";
import Bookmark from "Icons/Bookmark";
import { HexKey, TaggedRawEvent } from "Nostr";
import { useUserProfiles } from "Feed/ProfileFeed";
import { RootState } from "State/Store";

import messages from "./messages";

interface BookmarksProps {
  pubkey: HexKey;
  bookmarks: TaggedRawEvent[];
  related: TaggedRawEvent[];
}

const Bookmarks = ({ pubkey, bookmarks, related }: BookmarksProps) => {
  const [onlyPubkey, setOnlyPubkey] = useState<HexKey | "all">("all");
  const loginPubKey = useSelector((s: RootState) => s.login.publicKey);
  const ps = useMemo(() => {
    return bookmarks.reduce(
      ({ ps, seen }, e) => {
        if (seen.has(e.pubkey)) {
          return { ps, seen };
        }
        seen.add(e.pubkey);
        return {
          seen,
          ps: [...ps, e.pubkey],
        };
      },
      { ps: [] as HexKey[], seen: new Set() }
    ).ps;
  }, [bookmarks]);
  const profiles = useUserProfiles(ps);

  function renderOption(p: HexKey) {
    const profile = profiles?.get(p);
    return profile ? <option value={p}>{profile?.display_name || profile?.name}</option> : null;
  }

  return (
    <div className="main-content">
      <div className="icon-title">
        <Bookmark width={14} height={18} />{" "}
        <h3>
          <FormattedMessage {...messages.BookmarksCount} values={{ n: bookmarks.length }} />
        </h3>
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
