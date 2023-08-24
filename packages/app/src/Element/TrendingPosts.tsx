import { useEffect, useState } from "react";
import { NostrEvent, TaggedNostrEvent } from "@snort/system";

import PageSpinner from "Element/PageSpinner";
import Note from "Element/Note";
import NostrBandApi from "External/NostrBand";
import { useReactions } from "Feed/FeedReactions";

export default function TrendingNotes() {
  const [posts, setPosts] = useState<Array<NostrEvent>>();
  const related = useReactions("trending", posts?.map(a => a.id) ?? []);

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
      {posts.map(e => (
        <Note key={e.id} data={e as TaggedNostrEvent} related={related?.data ?? []} depth={0} />
      ))}
    </>
  );
}
