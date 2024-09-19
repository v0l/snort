import { useContext } from "react";

import Note, { NoteProps } from "@/Components/Event/EventComponent";
import { useArticles } from "@/Feed/ArticlesFeed";
import { DeckContext } from "@/Pages/Deck/DeckLayout";

export default function Articles({ noteProps }: { noteProps?: Omit<NoteProps, "data"> }) {
  const data = useArticles();
  const deck = useContext(DeckContext);

  return (
    <>
      {data.map(a => (
        <Note
          data={a}
          key={a.id}
          {...noteProps}
          options={{
            longFormPreview: true,
            ...noteProps?.options,
          }}
          onClick={ev => {
            deck?.setArticle(ev);
            noteProps?.onClick?.(ev);
          }}
        />
      ))}
    </>
  );
}
