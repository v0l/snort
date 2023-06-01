import { useEffect, useState } from "react";
import { NostrEvent, TaggedRawEvent } from "System";
import { FormattedMessage } from "react-intl";

import PageSpinner from "Element/PageSpinner";
import Note from "Element/Note";
import NostrBandApi from "External/NostrBand";

export default function TrendingNotes() {
  const [posts, setPosts] = useState<Array<NostrEvent>>();

  async function loadTrendingNotes() {
    const api = new NostrBandApi();
    const trending = await api.trendingNotes();
    setPosts(trending.notes.map(a => a.event));
  }

  useEffect(() => {
    loadTrendingNotes().catch(console.error);
  }, []);

  if (!posts) return <PageSpinner />;

  return (
    <>
      <h3>
        <FormattedMessage defaultMessage="Trending Notes" />
      </h3>
      {posts.map(e => (
        <Note key={e.id} data={e as TaggedRawEvent} related={[]} depth={0} />
      ))}
    </>
  );
}
