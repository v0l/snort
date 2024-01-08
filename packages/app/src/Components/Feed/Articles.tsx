import { useContext } from "react";

import { useArticles } from "@/Feed/ArticlesFeed";
import { DeckContext } from "@/Pages/DeckLayout";
import { orderDescending } from "@/Utils";

import Note from "../Event/EventComponent";

export default function Articles() {
  const data = useArticles();
  const deck = useContext(DeckContext);

  return (
    <>
      {orderDescending(data.data ?? []).map(a => (
        <Note
          data={a}
          key={a.id}
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
