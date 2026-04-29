import type { NostrEvent, ReqFilter, TaggedNostrEvent } from "@snort/system"
import { SnortContext } from "@snort/system-react"
import { unixNow } from "@snort/shared"
import { use, useState } from "react"

import AsyncButton from "@/Components/Button/AsyncButton"
import { CollapsedSection } from "@/Components/Collapsed"
import EventComponent from "@/Components/Event/EventComponent"

type ResultView = "notes" | "raw"

const FILTER_OPTIONS = [
  { key: "kinds", label: "Kinds" },
  { key: "authors", label: "Authors" },
  { key: "ids", label: "IDs" },
  { key: "#e", label: "#e" },
  { key: "#p", label: "#p" },
  { key: "#t", label: "#t" },
  { key: "#d", label: "#d" },
  { key: "#a", label: "#a" },
  { key: "#r", label: "#r" },
  { key: "#g", label: "#g" },
  { key: "search", label: "Search" },
  { key: "since", label: "Since" },
  { key: "until", label: "Until" },
  { key: "limit", label: "Limit" },
] as const

function isFieldSet(filter: ReqFilter, key: string): boolean {
  if (key === "since" || key === "until") return filter[key] !== undefined
  if (key === "search") return filter.search !== undefined && filter.search !== ""
  if (key === "limit") return filter.limit !== undefined
  const v = filter[key as keyof ReqFilter]
  return Array.isArray(v) && v.length > 0
}

function FilterRow({
  label,
  children,
  onRemove,
}: {
  label: string
  children: React.ReactNode
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs text-neutral-400 text-right">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
      <button type="button" onClick={onRemove} className="text-neutral-500 hover:text-white text-xs shrink-0">
        ✕
      </button>
    </div>
  )
}

/**
 * Multi-value chip input. Type a value, press Enter to add.
 * Click a chip to remove it.
 */
function ChipInput({
  values,
  onChange,
  placeholder,
  mono,
}: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder: string
  mono?: boolean
}) {
  const [input, setInput] = useState("")

  function commit() {
    const trimmed = input.trim()
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed])
    }
    setInput("")
  }

  return (
    <div className="flex flex-wrap gap-1 items-center layer-2 rounded px-2 py-1 min-h-[32px]">
      {values.map(v => (
        <button
          key={v}
          type="button"
          className={`inline-flex items-center gap-0.5 bg-nostr-purple/20 text-nostr-purple rounded px-1.5 text-xs ${
            mono ? "font-mono" : ""
          }`}
          onClick={() => onChange(values.filter(x => x !== v))}>
          {v.length > 16 ? `${v.slice(0, 6)}…${v.slice(-4)}` : v}
          <span className="text-[10px] opacity-60">✕</span>
        </button>
      ))}
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") {
            e.preventDefault()
            commit()
          } else if (e.key === "Backspace" && input === "" && values.length > 0) {
            onChange(values.slice(0, -1))
          }
        }}
        onBlur={commit}
        placeholder={values.length === 0 ? placeholder : ""}
        className="bg-transparent border-none outline-none flex-1 min-w-[60px] text-xs py-px"
      />
    </div>
  )
}

function FilterForm({ filter, onChange }: { filter: ReqFilter; onChange: (f: ReqFilter) => void }) {
  const [addField, setAddField] = useState<string | null>(null)
  const [openFields, setOpenFields] = useState<Set<string>>(() => {
    const s = new Set<string>()
    for (const o of FILTER_OPTIONS) {
      if (isFieldSet(filter, o.key)) s.add(o.key)
    }
    return s
  })

  const activeKeys = FILTER_OPTIONS.filter(o => openFields.has(o.key))
  const availableKeys = FILTER_OPTIONS.filter(o => !openFields.has(o.key))

  function update(patch: Partial<ReqFilter>) {
    onChange({ ...filter, ...patch })
  }

  function removeKey(key: string) {
    setOpenFields(prev => {
      const n = new Set(prev)
      n.delete(key)
      return n
    })
    const copy = { ...filter }
    delete copy[key as keyof ReqFilter]
    onChange(copy)
  }

  function addKey(key: string) {
    setAddField(null)
    setOpenFields(prev => new Set(prev).add(key))
    if (key === "kinds") update({ kinds: [1] })
    else if (key === "limit") update({ limit: 10 })
    else if (key === "since") update({ since: unixNow() - 86400 })
    else if (key === "until") update({ until: unixNow() })
    else if (key === "search") update({ search: "" })
    else onChange({ ...filter, [key]: [] })
  }

  return (
    <div className="flex flex-col gap-2">
      {activeKeys.map(({ key, label }) => (
        <FilterRow key={key} label={label} onRemove={() => removeKey(key)}>
          {key === "kinds" && (
            <ChipInput
              values={(filter.kinds ?? []).map(String)}
              onChange={v => update({ kinds: v.map(Number).filter(n => !Number.isNaN(n)) })}
              placeholder="Enter kind, press ↵"
              mono
            />
          )}
          {key === "authors" && (
            <ChipInput
              values={(filter.authors as string[]) ?? []}
              onChange={v => update({ authors: v })}
              placeholder="Enter pubkey, press ↵"
              mono
            />
          )}
          {key === "ids" && (
            <ChipInput
              values={(filter.ids as string[]) ?? []}
              onChange={v => update({ ids: v })}
              placeholder="Enter event id, press ↵"
              mono
            />
          )}
          {key.startsWith("#") && (
            <ChipInput
              values={(filter[key as keyof ReqFilter] as string[]) ?? []}
              onChange={v => onChange({ ...filter, [key]: v })}
              placeholder="Enter value, press ↵"
              mono
            />
          )}
          {key === "search" && (
            <input
              type="text"
              value={filter.search ?? ""}
              onChange={e => update({ search: e.target.value || undefined })}
              placeholder="full-text search"
              className="w-full px-2 py-1 rounded text-sm layer-2 border border-neutral-700 light:border-neutral-300"
            />
          )}
          {key === "since" && (
            <input
              type="datetime-local"
              value={filter.since ? new Date(filter.since * 1000).toISOString().slice(0, 16) : ""}
              onChange={e => {
                const ts = e.target.value ? Math.floor(new Date(e.target.value).getTime() / 1000) : undefined
                update({ since: ts })
              }}
              className="w-full px-2 py-1 rounded text-sm layer-2 border border-neutral-700 light:border-neutral-300"
            />
          )}
          {key === "until" && (
            <input
              type="datetime-local"
              value={filter.until ? new Date(filter.until * 1000).toISOString().slice(0, 16) : ""}
              onChange={e => {
                const ts = e.target.value ? Math.floor(new Date(e.target.value).getTime() / 1000) : undefined
                update({ until: ts })
              }}
              className="w-full px-2 py-1 rounded text-sm layer-2 border border-neutral-700 light:border-neutral-300"
            />
          )}
          {key === "limit" && (
            <input
              type="number"
              value={filter.limit ?? ""}
              onChange={e => update({ limit: e.target.value ? parseInt(e.target.value, 10) : undefined })}
              min={1}
              className="w-24 px-2 py-1 rounded text-sm layer-2 border border-neutral-700 light:border-neutral-300"
            />
          )}
        </FilterRow>
      ))}

      {availableKeys.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0" />
          {addField ? (
            <select
              className="flex-1 px-2 py-1 rounded text-sm layer-2 border border-neutral-700 light:border-neutral-300"
              value=""
              onChange={e => {
                if (e.target.value) addKey(e.target.value)
                setAddField(null)
              }}
              onBlur={() => setAddField(null)}>
              <option value="">Add field…</option>
              {availableKeys.map(o => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <button
              type="button"
              onClick={() => setAddField("open")}
              className="px-2 py-1 rounded text-sm text-nostr-purple hover:text-white transition-colors">
              + Add
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function DebugPage() {
  const system = use(SnortContext)
  const [filter, setFilter] = useState<ReqFilter>({ kinds: [1], limit: 10 })
  const [rawFilter, setRawFilter] = useState("")
  const [event, setEvent] = useState("")
  const [results, setResult] = useState<Array<TaggedNostrEvent>>([])
  const [resultView, setResultView] = useState<ResultView>("notes")
  const [filterMode, setFilterMode] = useState<"builder" | "raw">("builder")
  const [error, setError] = useState("")

  function getFilter(): ReqFilter | null {
    if (filterMode === "builder") return filter
    try {
      return JSON.parse(rawFilter)
    } catch {
      setError("Invalid JSON filter")
      return null
    }
  }

  async function search() {
    setError("")
    const f = getFilter()
    if (!f || !system.cacheRelay) return
    try {
      const r = await system.cacheRelay.query(["REQ", "debug", f])
      setResult(r.map(a => ({ ...a, relays: [] })))
    } catch (e) {
      setError(String(e))
    }
  }

  async function insert() {
    setError("")
    if (event && system.cacheRelay) {
      try {
        const r = await system.cacheRelay.event(JSON.parse(event) as NostrEvent)
        setResult([
          {
            content: JSON.stringify(r),
          } as unknown as TaggedNostrEvent,
        ])
      } catch (e) {
        setError(String(e))
      }
    }
  }

  async function removeEvents() {
    setError("")
    const f = getFilter()
    if (!f || !system.cacheRelay) return
    try {
      const r = await system.cacheRelay.delete(["REQ", "delete-events", f])
      setResult(r.map(a => ({ id: a }) as TaggedNostrEvent))
    } catch (e) {
      setError(String(e))
    }
  }

  function renderableAsNote(ev: TaggedNostrEvent): boolean {
    const noteKinds = [0, 1, 6, 7, 20, 21, 22, 40, 41, 42, 1111, 6969, 9041, 30023, 30311]
    return noteKinds.includes(ev.kind)
  }

  return (
    <div className="px-3 py-2 flex flex-col gap-4">
      <div className="layer-1 rounded p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Cache Query</h3>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setFilterMode("builder")}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                filterMode === "builder" ? "bg-nostr-purple text-white" : "layer-2 hover:bg-neutral-700"
              }`}>
              Builder
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("raw")}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                filterMode === "raw" ? "bg-nostr-purple text-white" : "layer-2 hover:bg-neutral-700"
              }`}>
              Raw JSON
            </button>
          </div>
        </div>

        {filterMode === "builder" ? (
          <FilterForm filter={filter} onChange={setFilter} />
        ) : (
          <textarea
            value={rawFilter}
            onChange={e => setRawFilter(e.target.value)}
            placeholder='{"kinds": [1], "limit": 10}'
            className="font-mono text-sm px-3 py-2 rounded min-h-[120px] layer-2 border border-neutral-700 light:border-neutral-300"
            spellCheck={false}
          />
        )}

        <CollapsedSection title={<span className="text-sm text-neutral-400">Filter Preview</span>} startClosed={true}>
          <pre className="text-xs text-mono text-neutral-300 p-2 overflow-x-auto">
            {JSON.stringify(filterMode === "builder" ? filter : rawFilter ? JSON.parse(rawFilter) : {}, undefined, 2)}
          </pre>
        </CollapsedSection>

        {error && <div className="text-red-400 text-sm">{error}</div>}

        <div className="flex gap-2">
          <AsyncButton onClick={() => search()}>Query</AsyncButton>
          <AsyncButton onClick={() => removeEvents()} className="!bg-red-600 hover:!bg-red-700">
            Delete Matching
          </AsyncButton>
        </div>
      </div>

      <CollapsedSection title={<h3 className="text-lg font-semibold">Manual Insert</h3>} startClosed={true}>
        <div className="flex flex-col gap-2 p-2">
          <textarea
            value={event}
            onChange={e => setEvent(e.target.value)}
            placeholder="paste a nostr event JSON"
            className="font-mono text-sm px-3 py-2 rounded min-h-[120px] layer-2 border border-neutral-700 light:border-neutral-300"
            spellCheck={false}
          />
          <AsyncButton onClick={() => insert()}>Insert</AsyncButton>
        </div>
      </CollapsedSection>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold">Results: {results.length}</h4>
          {results.length > 0 && (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setResultView("notes")}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  resultView === "notes" ? "bg-nostr-purple text-white" : "layer-2 hover:bg-neutral-700"
                }`}>
                Notes
              </button>
              <button
                type="button"
                onClick={() => setResultView("raw")}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  resultView === "raw" ? "bg-nostr-purple text-white" : "layer-2 hover:bg-neutral-700"
                }`}>
                Raw JSON
              </button>
            </div>
          )}
        </div>

        {results.length === 0 ? (
          <div className="text-neutral-500 text-sm p-4 text-center layer-1 rounded">No results</div>
        ) : resultView === "notes" ? (
          <div className="flex flex-col">
            {results.map(a =>
              renderableAsNote(a) ? (
                <EventComponent
                  key={a.id}
                  data={a}
                  options={{ showFooter: true, showHeader: true, showTime: true, canClick: false }}
                  ignoreModeration={true}
                />
              ) : (
                <div key={a.id ?? Math.random()} className="border-b layer-1 px-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-neutral-700 light:bg-neutral-300 rounded px-1.5 py-0.5">
                      Kind {a.kind}
                    </span>
                    {a.id && <span className="text-xs text-neutral-500 font-mono">{a.id.slice(0, 12)}…</span>}
                  </div>
                  <pre className="text-xs text-mono text-neutral-300 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(a, undefined, 2)}
                  </pre>
                </div>
              ),
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {results.map(a => (
              <pre
                key={a.id ?? Math.random()}
                className="text-xs text-mono text-neutral-300 p-2 layer-1 rounded overflow-x-auto">
                {JSON.stringify(a, undefined, 2)}
              </pre>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
