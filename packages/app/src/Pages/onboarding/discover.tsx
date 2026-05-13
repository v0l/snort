import { useEffect, useMemo, useState } from "react"
import { FormattedMessage } from "react-intl"
import { useLocation, useNavigate } from "react-router-dom"

import AsyncButton from "@/Components/Button/AsyncButton"
import FollowListBase from "@/Components/User/FollowListBase"
import PageSpinner from "@/Components/PageSpinner"
import { ErrorOrOffline } from "@/Components/ErrorOrOffline"
import { getNostrProfilesApi, type RecentClassification } from "@/External/NostrProfiles"
import NostrBandApi from "@/External/NostrBand"

import type { NewUserState } from "."

/**
 * Discover profiles matching the user's selected topics (labels from nostr-profiles API).
 * Falls back to trending users from nostr.band if no topics were selected or API fails.
 */
export default function Discover() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as NewUserState
  const selectedLabels = state?.topics ?? []

  const [matchingPubkeys, setMatchingPubkeys] = useState<Array<string> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [trendingPubkeys, setTrendingPubkeys] = useState<Array<string> | null>(null)

  /** Fetch label-matched profiles from nostr-profiles API */
  useEffect(() => {
    if (selectedLabels.length === 0) {
      setLoading(false)
      setMatchingPubkeys([])
      return
    }

    const api = getNostrProfilesApi()
    const seen = new Set<string>()
    const allResults: RecentClassification[] = []

    // Search each selected label and deduplicate
    Promise.allSettled(selectedLabels.map(label => api.searchByLabel(label, 10)))
      .then(results => {
        for (const r of results) {
          if (r.status === "fulfilled") {
            for (const profile of r.value) {
              if (!seen.has(profile.pubkey)) {
                seen.add(profile.pubkey)
                allResults.push(profile)
              }
            }
          }
        }
        setMatchingPubkeys(allResults.map(p => p.pubkey))
        setLoading(false)
      })
      .catch(err => {
        console.warn("Failed to load label-matched profiles", err)
        setError(err instanceof Error ? err : new Error(String(err)))
        setLoading(false)
      })
  }, [selectedLabels])

  /** Fallback: trending profiles from nostr.band */
  useEffect(() => {
    const api = new NostrBandApi()
    api
      .trendingProfiles()
      .then(data => {
        setTrendingPubkeys(data.profiles.map(p => p.pubkey).slice(0, 12))
      })
      .catch(console.warn)
  }, [])

  const pubkeys = useMemo(() => {
    if (matchingPubkeys && matchingPubkeys.length > 0) return matchingPubkeys
    return trendingPubkeys ?? []
  }, [matchingPubkeys, trendingPubkeys])

  const isMatching = matchingPubkeys && matchingPubkeys.length > 0

  if (loading) {
    return <PageSpinner />
  }

  if (error && pubkeys.length === 0) {
    return <ErrorOrOffline error={error} onRetry={() => {}} className="px-3 py-2" />
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-center">
        <FormattedMessage
          defaultMessage="{site} is more fun together!"
          values={{
            site: CONFIG.appNameCapitalized,
          }}
        />
      </h1>
      <div className="new-trending">
        <FollowListBase
          pubkeys={pubkeys}
          title={
            <h3>
              {isMatching ? (
                <FormattedMessage defaultMessage="Recommended for you" />
              ) : (
                <FormattedMessage defaultMessage="Trending Users" />
              )}
            </h3>
          }
          showFollowAll={true}
          className="flex flex-col gap-2"
          profilePreviewProps={{
            options: {
              about: true,
            },
          }}
        />
      </div>
      <AsyncButton
        className="primary"
        onClick={() =>
          navigate("/login/sign-up/moderation", {
            state,
          })
        }
      >
        <FormattedMessage defaultMessage="Next" />
      </AsyncButton>
    </div>
  )
}
