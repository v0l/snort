import { useEffect, useMemo, useState } from "react"
import { useIntl } from "react-intl"
import { useNavigate, useParams } from "react-router-dom"

import Timeline from "@/Components/Feed/Timeline"
import TabSelectors, { type Tab } from "@/Components/TabSelectors/TabSelectors"
import FollowListBase from "@/Components/User/FollowListBase"
import PageSpinner from "@/Components/PageSpinner"
import type { TimelineSubject } from "@/Feed/TimelineFeed"
import { getNostrProfilesApi, type RecentClassification } from "@/External/NostrProfiles"
import useProfileSearch from "@/Hooks/useProfileSearch"
import { appendDedupe } from "@/Utils"

const NOTES = 0
const PROFILES = 1

const Profiles = ({ keyword }: { keyword: string }) => {
  const searchFn = useProfileSearch()
  const localResults = useMemo(() => searchFn(keyword), [keyword, searchFn])

  const [apiResults, setApiResults] = useState<Array<RecentClassification>>([])
  const [apiLoading, setApiLoading] = useState(false)

  useEffect(() => {
    if (!keyword) return
    setApiLoading(true)
    const api = getNostrProfilesApi()
    api
      .search(keyword, 20)
      .then(setApiResults)
      .catch(() => setApiResults([]))
      .finally(() => setApiLoading(false))
  }, [keyword])

  // Merge: API results first (deduplicated with local), then remaining local results
  const mergedPubkeys = useMemo(() => {
    const apiPubkeys = apiResults.map(r => r.pubkey)
    const localPubkeys = localResults.map(r => r.pubkey).filter(pk => !apiPubkeys.includes(pk))
    return appendDedupe(apiPubkeys, localPubkeys)
  }, [apiResults, localResults])

  if (!keyword) return

  return (
    <div className="px-3 flex flex-col gap-4">
      {apiLoading && <PageSpinner />}
      <FollowListBase
        pubkeys={mergedPubkeys}
        profilePreviewProps={{
          options: { about: true },
        }}
      />
    </div>
  )
}

const SearchPage = () => {
  const params = useParams()
  const { formatMessage } = useIntl()
  const [search, setSearch] = useState<string>(params.keyword ?? "")
  // tabs
  const SearchTab = [
    { text: formatMessage({ defaultMessage: "Notes" }), value: NOTES },
    { text: formatMessage({ defaultMessage: "People" }), value: PROFILES },
  ]
  const [tab, setTab] = useState<Tab>(SearchTab[0])
  const navigate = useNavigate()

  const subject = useMemo(() => {
    return {
      type: "post_keyword",
      items: [search],
      discriminator: search,
    } as TimelineSubject
  }, [search])

  const content = useMemo(() => {
    if (tab.value === PROFILES) {
      return <Profiles keyword={params.keyword ?? ""} />
    }

    if (!params.keyword) {
      return
    }

    return <Timeline key={params.keyword} subject={subject} postsOnly={false} method={"LIMIT_UNTIL"} />
  }, [params.keyword, tab, subject])

  return (
    <div>
      <div className="px-3 py-2 flex flex-col gap-2">
        <input
          type="search"
          placeholder={formatMessage({ defaultMessage: "Search..." })}
          value={search}
          onChange={e => setSearch(e.target.value)}
          onSubmit={() => navigate(`/search/${encodeURIComponent(search)}`)}
          onKeyDown={k => {
            if (k.key === "Enter") {
              navigate(`/search/${encodeURIComponent(search)}`)
            }
          }}
        />
        <TabSelectors tabs={SearchTab} tab={tab} setTab={setTab} />
      </div>
      {content}
    </div>
  )
}

export default SearchPage
