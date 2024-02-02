import { useContext } from "react";

import { useArticles } from "@/Feed/ArticlesFeed";
import { DeckContext } from "@/Pages/DeckLayout";

import Note from "../Event/EventComponent";

const options = {
  longFormPreview: true,
};

export default function Articles() {
  const data = useArticles();
  const deck = useContext(DeckContext);

  return (
    <>
      {data.map(a => (
        <Note
          data={a}
          key={a.id}
          options={options}
          onClick={ev => {
            deck?.setArticle(ev);
          }}
        />
      ))}
    </>
  );
}
