import { useArticles } from "Feed/ArticlesFeed";
import { orderDescending } from "SnortUtils";
import Note from "../Note";

export default function Articles() {
  const data = useArticles();
  return (
    <>
      {orderDescending(data.data ?? []).map(a => (
        <Note data={a} key={a.id} related={[]} />
      ))}
    </>
  );
}
