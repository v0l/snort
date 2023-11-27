import { NostrLink } from "@snort/system";
import { useEventFeed } from "@snort/system-react";

import Note from "@/Element/Event/Note";
import PageSpinner from "@/Element/PageSpinner";

export default function NoteQuote({ link, depth }: { link: NostrLink; depth?: number }) {
  const ev = useEventFeed(link);
  if (!ev.data) return <PageSpinner />;
  return (
    <Note
      data={ev.data}
      related={[]}
      className="note-quote"
      depth={(depth ?? 0) + 1}
      options={{
        showFooter: false,
        truncate: true,
      }}
    />
  );
}
