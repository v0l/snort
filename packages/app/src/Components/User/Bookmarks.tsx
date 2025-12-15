import { TaggedNostrEvent } from "@snort/system";
import { ChangeEvent, use, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";

import Note from "@/Components/Event/EventComponent";
import useLogin from "@/Hooks/useLogin";

import messages from "../messages";
import { SnortContext } from "@snort/system-react";

interface BookmarksProps {
  pubkey: string;
  bookmarks: readonly TaggedNostrEvent[];
}

const Bookmarks = ({ pubkey, bookmarks }: BookmarksProps) => {
  const [onlyPubkey, setOnlyPubkey] = useState<string | "all">("all");
  const { publicKey } = useLogin(s => ({ publicKey: s.publicKey }));

  const system = use(SnortContext);
  const ps = useMemo(() => {
    return [...new Set(bookmarks.map(ev => ev.pubkey))];
  }, [bookmarks]);
  const options = useMemo(
    () => ({ showTime: false, showBookmarked: true, canUnbookmark: publicKey === pubkey, longFormPreview: true }),
    [publicKey, pubkey],
  );

  function renderOption(p: string) {
    const profile = system.config.profiles.getFromCache(p);
    return profile ? <option value={p}>{profile?.display_name || profile?.name}</option> : null;
  }

  return (
    <>
      <div className="flex-end px-3 py-2">
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
          return <Note key={n.id} data={n} options={options} />;
        })}
    </>
  );
};

export default Bookmarks;
