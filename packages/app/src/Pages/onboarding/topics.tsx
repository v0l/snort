import { EventKind } from "@snort/system"
import classNames from "classnames"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router-dom"

import AsyncButton from "@/Components/Button/AsyncButton"
import PageSpinner from "@/Components/PageSpinner"
import { getNostrProfilesApi, type LabelCount } from "@/External/NostrProfiles"
import useEventPublisher from "@/Hooks/useEventPublisher"
import { appendDedupe } from "@/Utils"

import type { NewUserState } from "."

/** Topic categories – we group fine-grained API labels under broader human-friendly buckets. */
interface TopicGroup {
  key: string
  text: ReactNode
  /** API labels that belong to this topic group */
  labels: string[]
}

/** Maps common API labels to friendly topic groups. Labels not matched fall into "Other". */
const TOPIC_GROUPS: TopicGroup[] = [
  {
    key: "bitcoin",
    text: <FormattedMessage defaultMessage="Bitcoin & Nostr" />,
    labels: [
      "bitcoin",
      "bitcoin-mining",
      "lightning-network",
      "nostr-developer",
      "nostr-enthusiast",
      "altcoin",
      "defi",
      "trading",
      "nft",
    ],
  },
  {
    key: "tech",
    text: <FormattedMessage defaultMessage="Technology" />,
    labels: [
      "rust",
      "python",
      "javascript",
      "golang",
      "linux",
      "self-hosting",
      "ai-ml",
      "cybersecurity",
      "embedded-systems",
      "open-source",
      "game-development",
    ],
  },
  {
    key: "creating",
    text: <FormattedMessage defaultMessage="Content & Art" />,
    labels: ["writer", "podcaster", "musician", "artist", "photographer", "video-creator", "memer"],
  },
  {
    key: "gaming",
    text: <FormattedMessage defaultMessage="Gaming" />,
    labels: ["gaming"],
  },
  {
    key: "lifestyle",
    text: <FormattedMessage defaultMessage="Lifestyle" />,
    labels: ["fitness", "food", "coffee", "travel", "hiking", "yoga", "meditation", "homesteading", "gardening"],
  },
  {
    key: "privacy",
    text: <FormattedMessage defaultMessage="Privacy & Freedom" />,
    labels: ["libertarian", "anarchist", "politics", "activism", "anti-authoritarian"],
  },
]

/**
 * Build topic groups enriched with the count from the API label distribution.
 * Sorted by total count descending so popular topics appear first.
 */
function buildEnrichedGroups(labelCounts: LabelCount[]): Array<TopicGroup & { count: number }> {
  const countMap = new Map(labelCounts.map(l => [l.label, l.count]))
  const enriched = TOPIC_GROUPS.map(group => ({
    ...group,
    count: group.labels.reduce((sum, label) => sum + (countMap.get(label) ?? 0), 0),
  }))
  enriched.sort((a, b) => b.count - a.count)
  return enriched
}

export default function Topics() {
  const { publisher, system } = useEventPublisher()
  const [topics, setTopics] = useState<Array<string>>([])
  const [groups, setGroups] = useState<Array<TopicGroup & { count: number }>>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const api = getNostrProfilesApi()
    api
      .getStats()
      .then(stats => {
        setGroups(buildEnrichedGroups(stats.labels.label_counts))
        setLoading(false)
      })
      .catch(err => {
        console.warn("Failed to load profile labels, using defaults", err)
        // Fallback: show all groups with 0 counts
        setGroups(TOPIC_GROUPS.map(g => ({ ...g, count: 0 })))
        setLoading(false)
      })
  }, [])

  const selectedLabels = useMemo(() => {
    const selected = new Set(topics)
    return TOPIC_GROUPS.filter(g => selected.has(g.key)).flatMap(g => g.labels)
  }, [topics])

  if (loading) {
    return <PageSpinner />
  }

  return (
    <div className="flex flex-col gap-6 text-center">
      <h1>
        <FormattedMessage defaultMessage="Pick a few topics of interest" />
      </h1>
      <div className="flex gap-2 flex-wrap justify-center">
        {groups.map(g => {
          const active = topics.includes(g.key)
          return (
            <button
              key={g.key}
              type="button"
              className={classNames(
                "flex gap-2 items-center px-4 py-2 my-1 border cursor-pointer font-semibold layer-2 !rounded-full",
                "hover:drop-shadow-sm",
                {
                  "!bg-white !text-black": active,
                },
              )}
              onClick={() => setTopics(s => (active ? s.filter(a => a !== g.key) : appendDedupe(s, [g.key])))}
            >
              {g.text}
              {g.count > 0 && <span className="text-xs opacity-60">{g.count.toLocaleString()}</span>}
            </button>
          )
        })}
      </div>
      <AsyncButton
        className="primary"
        onClick={async () => {
          if (selectedLabels.length > 0) {
            const ev = await publisher?.generic(eb => {
              eb.kind(EventKind.InterestsList)
              for (const a of selectedLabels) {
                eb.tag(["t", a])
              }
              return eb
            })
            if (ev) {
              await system.BroadcastEvent(ev)
            }
          }
          navigate("/login/sign-up/discover", {
            state: { topics: selectedLabels } as NewUserState,
          })
        }}
      >
        <FormattedMessage defaultMessage="Next" />
      </AsyncButton>
    </div>
  )
}
