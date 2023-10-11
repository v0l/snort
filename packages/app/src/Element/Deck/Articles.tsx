import { NostrLink } from "@snort/system";
import { useArticles } from "Feed/ArticlesFeed";
import { orderDescending } from "SnortUtils";
import Note from "../Event/Note";
import { useReactions } from "Feed/Reactions";

export default function Articles() {
  const data = useArticles();
  const related = useReactions("articles:reactions", data.data?.map(v => NostrLink.fromEvent(v)) ?? []);

  return (
    <>
      {orderDescending(data.data ?? []).map(a => (
        <Note
          data={a}
          key={a.id}
          related={related.data ?? []}
          options={{
            longFormPreview: true,
          }}
        />
      ))}
    </>
  );
}
