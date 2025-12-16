import fuzzySearch from "@/Db/FuzzySearch";

import useWoT, { type WoT } from "./useWoT";

export default function useProfileSearch() {
  const wot = useWoT();
  return (search: string | undefined) => userSearch(wot, search);
}

function userSearch(wot: WoT, search: string | undefined) {
  const searchString = search?.trim() ?? "";
  const fuseResults = (searchString?.length ?? 0) > 0 ? fuzzySearch.search(searchString) : [];

  const followDistanceNormalizationFactor = 3;
  const seenIds = new Set();

  const combinedResults = fuseResults
    .map(result => {
      const fuseScore = result.score === undefined ? 1 : result.score;

      const followDistance = wot.followDistance(result.item.pubkey) / followDistanceNormalizationFactor;

      const startsWithSearchString = [result.item.name, result.item.display_name, result.item.nip05].some(
        field => field && field.toLowerCase?.().startsWith(searchString.toLowerCase()),
      );

      const boostFactor = startsWithSearchString ? 0.25 : 1;

      const weightForFuseScore = 0.8;
      const weightForFollowDistance = 0.2;

      const combinedScore = (fuseScore * weightForFuseScore + followDistance * weightForFollowDistance) * boostFactor;

      return { ...result, combinedScore };
    })
    // Sort by combined score, lower is better
    .sort((a, b) => a.combinedScore - b.combinedScore)
    .filter(r => {
      // for some reason we get duplicates even though fuzzySearch should be removing existing profile on update
      if (seenIds.has(r.item.pubkey)) {
        return false;
      }
      seenIds.add(r.item.pubkey);
      return true;
    });

  return combinedResults.map(r => r.item);
}
