import { ProfilesCache } from "@/Cache"
import fuzzySearch, { addCachedMetadataToFuzzySearch, type FuzzySearchResult } from "@/Db/FuzzySearch"
import { getNostrProfilesApi } from "@/External/NostrProfiles"

import useWoT, { type WoT } from "./useWoT"

export default function useProfileSearch() {
  const wot = useWoT()
  return (search: string | undefined) => userSearch(wot, search)
}

export function useMentionSearch() {
  const search = useProfileSearch()
  return async (term: string): Promise<Array<FuzzySearchResult>> => {
    const [, remote] = await Promise.all([loadCachedProfiles(term), searchRemoteProfiles(term)])
    const local = search(term)
    const seen = new Set(local.map(a => a.pubkey))
    return [...local, ...remote.filter(a => !seen.has(a.pubkey))]
  }
}

async function loadCachedProfiles(term: string) {
  const query = term
    .split(/\s+/)
    .map(w => w.replaceAll('"', ""))
    .filter(w => w.length > 0)
    .map(w => `"${w}"*`)
    .join(" ")
  if (!query || !("search" in ProfilesCache)) return
  try {
    for (const profile of await ProfilesCache.search(query)) {
      addCachedMetadataToFuzzySearch(profile)
    }
  } catch (e) {
    console.warn("Profile cache search failed", e)
  }
}

async function searchRemoteProfiles(term: string): Promise<Array<FuzzySearchResult>> {
  if (term.length < 2) return []
  const timeout = new Promise<[]>(resolve => setTimeout(() => resolve([]), 1_500))
  try {
    const results = await Promise.race([getNostrProfilesApi().search(term, 5), timeout])
    return results.map(r => ({
      pubkey: r.pubkey,
      name: r.name ?? undefined,
      display_name: r.display_name ?? undefined,
      picture: r.picture ?? undefined,
    }))
  } catch {
    return []
  }
}

function userSearch(wot: WoT, search: string | undefined) {
  const searchString = search?.trim() ?? ""
  const fuseResults = (searchString?.length ?? 0) > 0 ? fuzzySearch.search(searchString) : []

  const followDistanceNormalizationFactor = 3
  const seenIds = new Set()

  const combinedResults = fuseResults
    .map(result => {
      const fuseScore = result.score === undefined ? 1 : result.score

      const followDistance = wot.followDistance(result.item.pubkey) / followDistanceNormalizationFactor

      const startsWithSearchString = [result.item.name, result.item.display_name, result.item.nip05].some(field =>
        field?.toLowerCase?.().startsWith(searchString.toLowerCase()),
      )

      const boostFactor = startsWithSearchString ? 0.25 : 1

      const weightForFuseScore = 0.8
      const weightForFollowDistance = 0.2

      const combinedScore = (fuseScore * weightForFuseScore + followDistance * weightForFollowDistance) * boostFactor

      return { ...result, combinedScore }
    })
    // Sort by combined score, lower is better
    .sort((a, b) => a.combinedScore - b.combinedScore)
    .filter(r => {
      // for some reason we get duplicates even though fuzzySearch should be removing existing profile on update
      if (seenIds.has(r.item.pubkey)) {
        return false
      }
      seenIds.add(r.item.pubkey)
      return true
    })

  return combinedResults.map(r => r.item)
}
