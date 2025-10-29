import { NostrEvent, TaggedNostrEvent } from "@snort/system";
import classNames from "classnames";
import { useMemo } from "react";

import { ErrorOrOffline } from "@/Components/ErrorOrOffline";
import Note from "@/Components/Event/EventComponent";
import { useLocale } from "@/Components/IntlProvider/useLocale";
import PageSpinner from "@/Components/PageSpinner";
import TrendingNote from "@/Components/Trending/ShortNote";
import NostrBandApi from "@/External/NostrBand";
import useCachedFetch from "@/Hooks/useCachedFetch";
import useModeration from "@/Hooks/useModeration";

export default function TrendingNotes({ count = Infinity, small = false }: { count?: number; small?: boolean }) {
  const api = new NostrBandApi();
  const { lang } = useLocale();
  const trendingNotesUrl = api.trendingNotesUrl(lang);
  const storageKey = `nostr-band-${trendingNotesUrl}`;

  const {
    data: trendingNotesData,
    isLoading,
    error,
  } = useCachedFetch<{ notes: Array<{ event: NostrEvent }> }, Array<NostrEvent>>(
    trendingNotesUrl,
    storageKey,
    data => data.notes.map(e => e.event),
    60 * 60,
  );

  const options = useMemo(
    () => ({
      showFooter: !small,
      showReactionsLink: !small,
      showMedia: !small,
      longFormPreview: !small,
      truncate: small,
      showContextMenu: !small,
    }),
    [small],
  );

  const { isEventMuted } = useModeration();
  if (error && !trendingNotesData) return <ErrorOrOffline error={error} className="px-3 py-2" />;
  if (isLoading) return <PageSpinner />;

  const filteredAndLimitedPosts = trendingNotesData
    ? trendingNotesData.filter(a => !isEventMuted(a)).slice(0, count)
    : [];

  const renderList = () => {
    return filteredAndLimitedPosts.map((e, index) =>
      small ? (
        <TrendingNote key={e.id} event={e as TaggedNostrEvent} />
      ) : (
        <Note key={e.id} data={e as TaggedNostrEvent} depth={0} options={options} waitUntilInView={index > 5} />
      ),
    );
  };

  return <div className={classNames("flex flex-col", { "gap-4 py-4": small })}>{renderList()}</div>;
}
