import { NostrLink } from "@snort/system";
import { useReactions } from "@snort/system-react";
import { useContext } from "react";

import { useArticles } from "@/Feed/ArticlesFeed";
import { DeckContext } from "@/Pages/DeckLayout";
import { orderDescending } from "@/Utils";

import Note from "../Event/Note";

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
