import { matchSorter } from "match-sorter";

export default async function searchEmoji(key: string) {
  const { lib } = await import("emojilib");
  /* build proper library with included name of the emoji */
  const library = Object.entries(lib).map(([name, emojiObject]) => ({
    ...emojiObject,
    keywords: [name, ...emojiObject.keywords],
    name,
  }));
  return matchSorter(library, key, { keys: ["keywords"] });
}
