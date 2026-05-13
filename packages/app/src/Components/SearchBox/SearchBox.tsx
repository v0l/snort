import { NostrLink, tryParseNostrLink } from "@snort/system"
import { fetchNip05Pubkey } from "@snort/shared"
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useNavigate } from "react-router-dom"

import Icon from "@/Components/Icons/Icon"
import Spinner from "@/Components/Icons/Spinner"
import ProfileImage from "@/Components/User/ProfileImage"
import { getNostrProfilesApi } from "@/External/NostrProfiles"
import useProfileSearch from "@/Hooks/useProfileSearch"

const MAX_RESULTS = 3

export default function SearchBox() {
  const { formatMessage } = useIntl()
  const [search, setSearch] = useState("")
  const [searching, setSearching] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const resultListRef = useRef<HTMLDivElement | null>(null)

  const searchFn = useProfileSearch()
  const localPubkeys = useMemo(() => {
    const results = searchFn(search)
    return results.map(r => r.pubkey)
  }, [search, searchFn])

  // Augment with nostr-profiles API results
  const [apiPubkeys, setApiPubkeys] = useState<Array<string>>([])
  useEffect(() => {
    if (!search || search.length < 2) {
      setApiPubkeys([])
      return
    }
    const api = getNostrProfilesApi()
    api
      .search(search, 3)
      .then(results => setApiPubkeys(results.map(r => r.pubkey)))
      .catch(() => setApiPubkeys([]))
  }, [search])

  // Merge: API results first, then local (deduplicated)
  const mergedPubkeys = useMemo(() => {
    const apiSet = new Set(apiPubkeys)
    const local = localPubkeys.filter(pk => !apiSet.has(pk))
    return [...apiPubkeys, ...local].slice(0, MAX_RESULTS + 5)
  }, [apiPubkeys, localPubkeys])

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearch("")
      }
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    document.addEventListener("keydown", handleGlobalKeyDown)

    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown)
    }
  }, [])

  useEffect(() => {
    // Close the search on navigation
    setSearch("")
    setActiveIndex(-1)
  }, [])

  const executeSearch = async () => {
    try {
      setSearching(true)
      const link = tryParseNostrLink(search)
      if (link) {
        navigate(`/${link.encode()}`)
        return
      }
      if (search.includes("@")) {
        const [handle, domain] = search.split("@")
        const pk = await fetchNip05Pubkey(handle, domain)
        if (pk) {
          navigate(`/${new NostrLink(CONFIG.profileLinkPrefix, pk).encode()}`)
          return
        }
      }
      navigate(`/search/${encodeURIComponent(search)}`)
    } finally {
      setSearching(false)
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val.match(/nsec1[a-zA-Z0-9]{20,65}/gi)) {
      e.preventDefault()
    } else if (val.trim().match(/^(npub|note|nevent|nprofile)1[a-zA-Z0-9]{20,200}$/gi)) {
      navigate(`/${val.trim()}`)
      e.preventDefault()
    } else {
      setSearch(val)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "Enter":
        if (activeIndex === 0) {
          navigate(`/search/${encodeURIComponent(search)}`)
        } else if (activeIndex > 0 && mergedPubkeys.length > 0) {
          const selectedPubkey = mergedPubkeys[activeIndex - 1]
          if (selectedPubkey) {
            navigate(`/${new NostrLink(CONFIG.profileLinkPrefix, selectedPubkey).encode()}`)
            inputRef.current?.blur()
          }
        } else {
          executeSearch()
        }
        break
      case "ArrowDown":
        e.preventDefault()
        setActiveIndex(prev => Math.min(prev + 1, Math.min(MAX_RESULTS, mergedPubkeys.length)))
        break
      case "ArrowUp":
        e.preventDefault()
        setActiveIndex(prev => Math.max(prev - 1, 0))
        break
      default:
        break
    }
  }

  return (
    <div className="flex layer-1 relative">
      <input
        ref={inputRef}
        type="text"
        placeholder={formatMessage({ defaultMessage: "Search" })}
        className="w-full !border-none !rounded-none leading-10 py-2.5 px-4"
        value={search}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 150)}
      />
      {searching ? (
        <Spinner width={24} height={24} className="my-2.5 mx-4" />
      ) : (
        <Icon className="my-2.5 mx-4" name="search-outline" size={24} onClick={() => navigate("/search")} />
      )}
      {search && !searching && isFocused && (
        <div
          className="absolute top-full mt-2 w-full border bg-white dark:bg-black shadow-lg rounded-lg z-10 overflow-hidden"
          ref={resultListRef}
        >
          <button
            type="button"
            className="w-full text-left cursor-pointer p-2 hover:bg-layer-2"
            onMouseEnter={() => setActiveIndex(0)}
            onClick={() => navigate(`/search/${encodeURIComponent(search)}`, { state: { forceRefresh: true } })}
          >
            <FormattedMessage defaultMessage="Search notes" />: <b>{search}</b>
          </button>
          {mergedPubkeys.slice(0, MAX_RESULTS).map(pubkey => (
            <ProfileImage key={pubkey} pubkey={pubkey} showProfileCard={false} className="p-2 hover:bg-layer-2" />
          ))}
        </div>
      )}
    </div>
  )
}
