import { DVMJobState } from "@snort/system";
import classNames from "classnames";
import { useMemo } from "react";

import { ErrorOrOffline } from "@/Components/ErrorOrOffline";
import Note from "@/Components/Event/EventComponent";
import PageSpinner from "@/Components/PageSpinner";
import TrendingNote from "@/Components/Trending/ShortNote";
import useModeration from "@/Hooks/useModeration";
import useContentDiscovery from "@/Hooks/useContentDiscovery";

export default function TrendingNotes({ count = Infinity, small = false }: { count?: number; small?: boolean }) {
  const { req, data, error } = useContentDiscovery("0d9ec486275b70f0c4faec277fc4c63b9f14cb1ca1ec029f7d76210e957e5257", ["wss://relay.primal.net/"]);
  const { isEventMuted } = useModeration();

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

  if (error && !data) return <ErrorOrOffline error={error} className="px-3 py-2" />;
  if (req.state !== DVMJobState.Success) return <PageSpinner />;

  const filteredAndLimitedPosts = data
    ? data.filter(a => !isEventMuted(a)).slice(0, count)
    : [];

  const renderList = () => {
    return filteredAndLimitedPosts.map((e, index) =>
      small ? (
        <TrendingNote key={e.id} event={e} />
      ) : (
        <Note key={e.id} data={e} depth={0} options={options} waitUntilInView={index > 5} />
      ),
    );
  };

  return <div className={classNames("flex flex-col", { "gap-4 py-4": small })}>{renderList()}</div>;
}
