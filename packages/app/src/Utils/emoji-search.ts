import { matchSorter } from "match-sorter";

export default async function searchEmoji(key: string) {
  const emoji = await import("emojilib");
  /* build proper library with included name of the emoji */
  const library = Object.entries(emoji).map(([emoji, keywords]) => ({
    name: keywords[0],
    keywords,
    char: emoji,
  }));
  return matchSorter(library, key, { keys: ["keywords"] });
}
