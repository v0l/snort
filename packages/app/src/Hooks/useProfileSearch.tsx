import { useEffect, useMemo, useState } from "react";

import fuzzySearch from "@/Db/FuzzySearch";
import useTimelineFeed, { TimelineFeedOptions, TimelineSubject } from "@/Feed/TimelineFeed";
import { debounce } from "@/Utils";

import useWoT from "./useWoT";

const options: TimelineFeedOptions = { method: "LIMIT_UNTIL" };

export default function useProfileSearch(search: string) {
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    return debounce(500, () => {
      setDebouncedSearch(search);
    });
  }, [search]);

  const subject = useMemo(
    () =>
      ({
        type: "profile_keyword",
        items: debouncedSearch ? [debouncedSearch] : [],
        discriminator: debouncedSearch,
      }) as TimelineSubject,
    [debouncedSearch],
  );
  const feed = useTimelineFeed(subject, options);
  const results = useMemo(() => {
    return userSearch(search);
  }, [search, feed]);

  return results;
}

export function userSearch(search: string) {
  const wot = useWoT();
  const searchString = search.trim();
  const fuseResults = fuzzySearch.search(searchString);

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
