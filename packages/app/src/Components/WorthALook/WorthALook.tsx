import { NostrPrefix } from "@snort/shared"
import { findTag, NostrLink, type TaggedNostrEvent } from "@snort/system"
import { useEventFeed } from "@snort/system-react"
import classNames from "classnames"
import { type ReactNode, useMemo, useState } from "react"
import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router-dom"

import NoteTime from "@/Components/Event/Note/NoteTime"
import { ProxyImg } from "@/Components/ProxyImg"
import { AvatarGroup } from "@/Components/User/AvatarGroup"
import DisplayName from "@/Components/User/DisplayName"
import ProfilePreview from "@/Components/User/ProfilePreview"

import type { DiscoveryItem, DiscoveryReason } from "./discovery"
import { useNetworkDiscovery, usePopularNotes, usePopularPeople } from "./useWorthALook"

type Filter = "all" | "threads" | "photos" | "reads" | "people"

const ImageRegex = /https?:\/\/\S+\.(?:png|jpe?g|gif|webp|avif)(?:\?\S*)?/i
const ArticleKind = 30023

function firstImage(ev: TaggedNostrEvent) {
  const imeta = ev.tags
    .find(t => t[0] === "imeta")
    ?.find(v => v.startsWith("url "))
    ?.slice(4)
  return findTag(ev, "image") ?? imeta ?? ev.content.match(ImageRegex)?.[0]
}

function summary(ev: TaggedNostrEvent) {
  const text = ev.kind === ArticleKind ? (findTag(ev, "summary") ?? ev.content) : ev.content
  return text
    .replace(ImageRegex, "")
    .replace(/nostr:\S+/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function kindOf(ev: TaggedNostrEvent): Exclude<Filter, "all" | "people"> {
  if (ev.kind === ArticleKind) return "reads"
  if (firstImage(ev)) return "photos"
  return "threads"
}

function Reason({ reason, by }: { reason: DiscoveryReason; by: Array<string> }) {
  const names = by.slice(0, 2).map(p => <DisplayName key={p} pubkey={p} />)
  const values = { a: names[0], b: names[1], n: by.length, others: by.length - 2 }
  const text = (() => {
    switch (reason) {
      case "thread":
        return <FormattedMessage defaultMessage="{n} people you follow are in this thread" values={values} />
      case "zapped":
        return by.length > 1 ? (
          <FormattedMessage defaultMessage="Zapped by {a} and {b}" values={values} />
        ) : (
          <FormattedMessage defaultMessage="Zapped by {a}" values={values} />
        )
      case "highlighted":
        return by.length > 1 ? (
          <FormattedMessage defaultMessage="Highlighted by {a} and {b}" values={values} />
        ) : (
          <FormattedMessage defaultMessage="Highlighted by {a}" values={values} />
        )
      case "reposted":
        return by.length > 1 ? (
          <FormattedMessage defaultMessage="Reposted by {a} and {b}" values={values} />
        ) : (
          <FormattedMessage defaultMessage="Reposted by {a}" values={values} />
        )
    }
  })()
  return (
    <div className="flex items-center gap-2 text-sm text-neutral-400 font-medium mb-2">
      <AvatarGroup ids={by.slice(0, 4)} size={20} />
      <span className="truncate">{text}</span>
    </div>
  )
}

function Card({ ev, why }: { ev: TaggedNostrEvent; why: ReactNode }) {
  const navigate = useNavigate()
  const link = useMemo(() => `/${NostrLink.fromEvent(ev).encode(CONFIG.eventLinkPrefix)}`, [ev])
  const image = firstImage(ev)
  const title = ev.kind === ArticleKind ? findTag(ev, "title") : undefined
  const text = summary(ev)
  return (
    <a
      href={link}
      onClick={e => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        navigate(link, { state: ev })
      }}
      className="block py-3 border-b cursor-pointer hover:bg-layer-1 -mx-2 px-2 rounded-lg hover:no-underline text-inherit"
      data-worth-a-look
    >
      {why}
      {image && <ProxyImg src={image} className="w-full max-h-56 object-cover rounded-lg mb-2" />}
      {title && <div className="text-lg font-bold leading-snug mb-1">{title}</div>}
      {text && <div className="line-clamp-3 break-words">{text}</div>}
      <div className="flex items-center gap-2 mt-2 text-sm text-neutral-400">
        <AvatarGroup ids={[ev.pubkey]} size={18} />
        <span className="text-white light:text-black font-semibold truncate">
          <DisplayName pubkey={ev.pubkey} />
        </span>
        <NoteTime from={ev.created_at * 1000} />
      </div>
    </a>
  )
}

function NetworkCard({ item, filter }: { item: DiscoveryItem; filter: Filter }) {
  const ev = useEventFeed(item.link)
  if (!ev) return null
  if (filter !== "all" && filter !== kindOf(ev)) return null
  return <Card ev={ev} why={<Reason reason={item.reason} by={item.by} />} />
}

function People({ pubkeys, why }: { pubkeys: Array<string>; why: ReactNode }) {
  const navigate = useNavigate()
  if (pubkeys.length === 0) return null
  return (
    <div className="py-3 border-b">
      <div className="text-sm text-neutral-400 font-medium mb-2">{why}</div>
      <div className="flex flex-col gap-2">
        {pubkeys.map(p => (
          <ProfilePreview
            key={p}
            pubkey={p}
            options={{ about: false }}
            actions={<span />}
            onClick={() => navigate(`/${new NostrLink(NostrPrefix.PublicKey, p).encode()}`)}
            className="cursor-pointer"
          />
        ))}
      </div>
    </div>
  )
}

function Popular({ filter }: { filter: Filter }) {
  const notes = usePopularNotes()
  const people = usePopularPeople()
  const shown = notes.filter(ev => filter === "all" || filter === kindOf(ev)).slice(0, 12)
  return (
    <>
      {filter !== "people" &&
        shown.map((ev, i) => (
          <Card
            key={ev.id}
            ev={ev}
            why={
              <div className="text-sm text-neutral-400 font-medium mb-2">
                {i === 0 ? (
                  <FormattedMessage defaultMessage="The most talked about note on nostr right now" />
                ) : (
                  <FormattedMessage defaultMessage="Popular on nostr today" />
                )}
              </div>
            }
          />
        ))}
      {(filter === "all" || filter === "people") && (
        <People
          pubkeys={people.slice(0, filter === "people" ? 12 : 3)}
          why={<FormattedMessage defaultMessage="Popular people to follow" />}
        />
      )}
    </>
  )
}

function Network({ filter }: { filter: Filter }) {
  const { items, people } = useNetworkDiscovery()
  const top = items.slice(0, 20)
  const peopleBlock = (
    <People
      pubkeys={people.slice(0, filter === "people" ? 12 : 3).map(p => p.pubkey)}
      why={<FormattedMessage defaultMessage="People your follows reply to a lot" />}
    />
  )
  if (top.length === 0 && people.length === 0) return <Popular filter={filter} />
  return (
    <>
      {filter !== "people" && top.slice(0, 3).map(i => <NetworkCard key={i.link.tagKey} item={i} filter={filter} />)}
      {(filter === "all" || filter === "people") && peopleBlock}
      {filter !== "people" && top.slice(3).map(i => <NetworkCard key={i.link.tagKey} item={i} filter={filter} />)}
    </>
  )
}

export function WorthALook() {
  const { enabled } = useNetworkDiscovery()
  const [filter, setFilter] = useState<Filter>("all")
  const filters: Array<[Filter, ReactNode]> = [
    ["all", <FormattedMessage key="all" defaultMessage="Everything" />],
    ["threads", <FormattedMessage key="threads" defaultMessage="Threads" />],
    ["photos", <FormattedMessage key="photos" defaultMessage="Photos" />],
    ["reads", <FormattedMessage key="reads" defaultMessage="Long reads" />],
    ["people", <FormattedMessage key="people" defaultMessage="People" />],
  ]
  return (
    <div className="flex flex-col">
      <fieldset className="flex gap-1.5 py-2 overflow-x-auto hide-scrollbar border-0 m-0 p-0 min-w-0">
        {filters.map(([f, label]) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={classNames(
              "plain flex-none rounded-full px-3 py-1 text-sm font-semibold border",
              filter === f
                ? "bg-white text-black border-white light:bg-black light:text-white light:border-black"
                : "text-neutral-400",
            )}
          >
            {label}
          </button>
        ))}
      </fieldset>
      {enabled ? <Network filter={filter} /> : <Popular filter={filter} />}
    </div>
  )
}

export function WorthALookPage() {
  return (
    <div className="px-3">
      <WorthALook />
    </div>
  )
}
