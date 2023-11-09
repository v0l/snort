import { NostrLink } from "@snort/system";
import { useReactions } from "@snort/system-react";

import { useArticles } from "Feed/ArticlesFeed";
import { orderDescending } from "SnortUtils";
import Note from "../Event/Note";
import { useContext } from "react";
import { DeckContext } from "Pages/DeckLayout";

export default function Articles() {
  const data = useArticles();
  const deck = useContext(DeckContext);
  const related = useReactions(
    "articles:reactions",
    data.data?.map(v => NostrLink.fromEvent(v)) ?? [],
    undefined,
    true,
  );

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
          onClick={ev => {
            deck?.setArticle(ev);
          }}
        />
      ))}
    </>
  );
}
