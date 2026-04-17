import { useState, useRef, useCallback, useEffect, useSyncExternalStore, use } from "react"
import { type AiStreamEvent, useAiAgent } from "@/Hooks/useAiAgent"
import { Markdown } from "@/Components/Event/Markdown"
import { FixedPage } from "../FixedPage"
import { FormattedMessage, useIntl } from "react-intl"
import Spinner from "@/Components/Icons/Spinner"
import { ExternalStore, unixNow } from "@snort/shared"
import { AvatarGroup } from "@/Components/User/AvatarGroup"
import { useLocation } from "react-router-dom"
import { Note } from "@/Components/Event/Note/Note"
import type { NostrEvent, TaggedNostrEvent } from "@snort/system"
import AsyncButton from "@/Components/Button/AsyncButton"
import { SnortContext } from "@snort/system-react"
import usePreferences from "@/Hooks/usePreferences"
import { setPreference } from "@/Utils/Login"
import Icon from "@/Components/Icons/Icon"

interface ChatMessage {
  id: string
  created: number
  role: "user" | "assistant"
  segments: Array<AiStreamEvent>
  thinkingExpanded?: boolean
  done: boolean
}

class MessageStore extends ExternalStore<Array<ChatMessage>> {
  private messages: Array<ChatMessage> = []

  addMessage(msg: ChatMessage) {
    this.messages.push(msg)
    this.notifyChange()
  }

  addStreamChunk(msgId: string, event: AiStreamEvent) {
    // Convertes the streamed raw chunks into single accumilated chunks for better UX
    const acc = this.messages.find(a => a.id === msgId)
    if (!acc) {
      console.warn("AGENT: Dropping new segment, agent message not found: ", event)
      return
    }
    if (event.type === "done") {
      acc.done = true
      this.notifyChange()
      return
    }
    if (acc.segments.length > 0 && acc.segments[acc.segments.length - 1].type === event.type) {
      const lastSeg = acc.segments[acc.segments.length - 1]
      if ("content" in lastSeg && "content" in event) {
        lastSeg.content += event.content
      } else {
        // Skip empty new segments (like '\n\n' at the start)
        if ("content" in event && event.content.trim().length > 0) {
          acc.segments.push(event)
        }
      }
    } else {
      acc.segments.push(event)
    }
    this.notifyChange()
  }

  updateMessage(msgId: string, fnUpdate: (old: ChatMessage) => void) {
    const old = this.messages.find(a => a.id === msgId)
    if (old) {
      fnUpdate(old)
      this.notifyChange()
    }
  }

  takeSnapshot(p?: any): ChatMessage[] {
    return [...this.messages]
  }
}

export default function AgentPage() {
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [models, setModels] = useState<Array<{ id: string }>>([])
  const messagesRef = useRef(new MessageStore())
  const scrollRef = useRef<HTMLDivElement>(null)
  const { formatMessage } = useIntl()
  const { state } = useLocation()
  const { runStream, models: listModels } = useAiAgent()
  const system = use(SnortContext)
  const { agentModel } = usePreferences(s => ({
    agentModel: s.agentModel,
  }))

  const messages = useSyncExternalStore(
    c => messagesRef.current.hook(c),
    () => messagesRef.current.snapshot(),
  )

  // Fetch models when agent URL changes
  useEffect(() => {
    listModels().then(setModels)
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      const t = requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      })
      return () => {
        cancelAnimationFrame(t)
      }
    }
  }, [messages, scrollRef])

  const sendChat = useCallback(
    async (e: string) => {
      const trimmed = e.trim()
      if (!trimmed || isLoading) return

      setError(null)
      setInput("")

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        created: unixNow(),
        segments: [{ type: "text", content: trimmed }],
        done: true,
      }

      const assistantId = `assistant-${Date.now()}`
      const assistantMsg: ChatMessage = {
        id: assistantId,
        created: userMsg.created + 1,
        role: "assistant",
        segments: [],
        thinkingExpanded: false,
        done: false,
      }
      messagesRef.current.addMessage(userMsg)
      messagesRef.current.addMessage(assistantMsg)
      setIsLoading(true)

      try {
        const stream = runStream(trimmed)
        for await (const event of stream) {
          messagesRef.current.addStreamChunk(assistantId, event)
        }
      } catch (err) {
        console.error("AI stream error:", err)
        messagesRef.current.updateMessage(assistantId, c => {
          c.segments = [{ type: "error", error: err as Error | string }]
          c.done = true
        })
      } finally {
        setIsLoading(false)
      }
    },
    [input, runStream, messagesRef],
  )

  useEffect(() => {
    if (
      messagesRef.current.snapshot().length === 0 &&
      state?.initialMessage &&
      typeof state.initialMessage === "string"
    ) {
      sendChat(state.initialMessage)
    }
  }, [state, messagesRef, sendChat])

  const renderSegments = (msg: ChatMessage) => {
    return msg.segments.map((seg, i) => {
      if (seg.type === "thinking") {
        return (
          <div className="text-xs text-gray-400 italic border-l-2 border-gray-500 pl-2 mb-2">
            <span
              onClick={() => {
                messagesRef.current.updateMessage(msg.id, o => {
                  o.thinkingExpanded = !o.thinkingExpanded
                })
              }}
              className={`cursor-pointer hover:text-gray-300 transition-colors${msg.done ? "" : " animate-pulse"}`}
            >
              <span className="font-semibold">Thinking:</span> {msg.thinkingExpanded ? "▼" : "▶"}
            </span>
            {msg.thinkingExpanded && <Markdown key={`${msg.id}-thinking-${i}`} content={seg.content} />}
          </div>
        )
      }
      if (seg.type === "text") {
        return <Markdown key={`${msg.id}-text-${i}`} content={seg.content} />
      }
      if (seg.type === "error") {
        return (
          <span className="text-error font-bold flex gap-2 items-center">
            <Icon name="x" />
            {seg.error instanceof Error ? seg.error.message : seg.error}
          </span>
        )
      }
      if (seg.type === "tool_call") {
        const argsStr =
          typeof seg.args === "object" && seg.args !== null ? JSON.stringify(seg.args, null, 2) : String(seg.args)
        return (
          <div key={`tool-call-${i}`} className="text-xs text-gray-400 block mt-1">
            → {seg.name}
            <pre className="text-[10px] bg-layer-3 p-2 rounded overflow-auto max-h-64">{argsStr}</pre>
          </div>
        )
      }
      if (seg.type === "tool_result") {
        switch (seg.name) {
          case "query_nostr": {
            if (Array.isArray(seg.result)) {
              return (
                <div key={`tool-result-${i}`} className="text-xs text-gray-300 block">
                  <div className="mb-1 text-green-400">
                    <FormattedMessage defaultMessage="Found {n} events!" values={{ n: seg.result.length }} />
                  </div>
                  <pre className="text-[10px] bg-layer-3 p-2 rounded overflow-auto max-h-64">
                    {JSON.stringify(seg.result, null, 2)}
                  </pre>
                </div>
              )
            }
            if (typeof seg.result === "string" && seg.result.startsWith("Error")) {
              return (
                <div key={`tool-result-${i}`} className="text-xs text-red-400 block">
                  {seg.result}
                </div>
              )
            }
            // Handle JSON string result (like from prepare_event_filter)
            if (typeof seg.result === "string") {
              try {
                const parsed = JSON.parse(seg.result)
                return (
                  <div key={`tool-result-${i}`} className="text-xs text-gray-300 block">
                    {parsed.note && <div className="mb-1">{parsed.note}</div>}
                    <pre className="text-[10px] bg-layer-3 p-2 rounded overflow-auto max-h-64">
                      {JSON.stringify(parsed, null, 2)}
                    </pre>
                  </div>
                )
              } catch {
                return (
                  <div key={`tool-result-${i}`} className="text-xs text-gray-300 block">
                    {seg.result}
                  </div>
                )
              }
            }
          }
          case "prepare_event_filter": {
            if (typeof seg.result === "string" && !seg.result.startsWith("Error")) {
              try {
                const parsed = JSON.parse(seg.result)
                return (
                  <div key={`tool-result-${i}`} className="text-xs text-gray-300 block">
                    {parsed.note && <div className="mb-1">{parsed.note}</div>}
                    <pre className="text-[10px] bg-layer-3 p-2 rounded overflow-auto max-h-64">
                      {JSON.stringify(parsed, null, 2)}
                    </pre>
                  </div>
                )
              } catch {
                return (
                  <div key={`tool-result-${i}`} className="text-xs text-gray-300 block">
                    {seg.result}
                  </div>
                )
              }
            }
            if (typeof seg.result === "string" && seg.result.startsWith("Error")) {
              return (
                <div key={`tool-result-${i}`} className="text-xs text-red-400 block">
                  {seg.result}
                </div>
              )
            }
          }
          case "search_username": {
            if (Array.isArray(seg.result)) {
              const results = seg.result as Array<{ pubkey: string }>
              return (
                <span key={`tool-result-${i}`} className="text-xs text-gray-300 block">
                  <FormattedMessage defaultMessage="Results:" />
                  <AvatarGroup ids={[...results].reverse().map(a => a.pubkey)} />
                </span>
              )
            }
            break
          }
          case "create_event": {
            return (
              <div key={`tool-result-${i}`} className="p-2 bg-neutral-900 rounded-lg">
                <Note data={seg.result as TaggedNostrEvent} />
                <AsyncButton
                  onClick={async () => {
                    await system.BroadcastEvent(seg.result as NostrEvent)
                  }}
                >
                  <FormattedMessage defaultMessage="Post Event" />
                </AsyncButton>
              </div>
            )
          }
          default:
            break
        }

        // Default fallback for other tool results
        let resultDisplay: React.ReactNode = String(seg.result ?? "")
        if (typeof seg.result === "string") {
          try {
            const parsed = JSON.parse(seg.result)
            resultDisplay = (
              <pre className="text-[10px] bg-layer-3 p-2 rounded overflow-auto max-h-64">
                {JSON.stringify(parsed, null, 2)}
              </pre>
            )
          } catch {
            // Not JSON, display as-is
            resultDisplay = seg.result
          }
        } else if (typeof seg.result === "object" && seg.result !== null) {
          resultDisplay = (
            <pre className="text-[10px] bg-layer-3 p-2 rounded overflow-auto max-h-64">
              {JSON.stringify(seg.result, null, 2)}
            </pre>
          )
        }

        return (
          <span key={`tool-result-${i}`} className="text-xs text-gray-300 block">
            ← {seg.name}: {resultDisplay}
          </span>
        )
      }
      return null
    })
  }

  return (
    <FixedPage className="flex flex-col">
      <div className="px-4 border-b border-gray-700">
        <div className="flex items-center py-2">
          <div className="text-lg font-semibold flex-1">
            <FormattedMessage defaultMessage="Agent" />
          </div>
          {/* Model Selector */}
          {models.length > 1 && (
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs text-gray-500 block mb-1">
                <FormattedMessage defaultMessage="Model" />
              </label>
              <select
                value={agentModel || ""}
                onChange={e => {
                  setPreference({ agentModel: e.target.value })
                }}
                className="w-full bg-layer-2 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {models.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.id}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-400">
          <FormattedMessage
            defaultMessage="Ask me anything about Nostr or {appName}"
            values={{ appName: CONFIG.appNameCapitalized }}
          />
        </p>
      </div>

      {messages.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          <p className="text-lg mb-2">
            <FormattedMessage defaultMessage="👋 Welcome to AI Chat!" />
          </p>
          <p>
            <FormattedMessage
              defaultMessage="Ask me to post, reply, search, or help you navigate {appName}"
              values={{ appName: CONFIG.appNameCapitalized }}
            />
          </p>
        </div>
      )}
      <div ref={scrollRef} className="overflow-y-auto p-4 space-y-4 flex-1">
        <div className="flex flex-col gap-2">
          {messages
            .sort((a, b) => a.created - b.created)
            .map(msg => {
              return (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[90%] rounded-lg p-3 ${
                      msg.role === "user" ? "bg-primary text-white" : "bg-layer-2 text-gray-100"
                    }`}
                  >
                    <div className="overflow-auto">
                      {renderSegments(msg)}
                      {!msg.done && msg.role === "assistant" && <Spinner height={14} />}
                    </div>
                  </div>
                </div>
              )
            })}

          {error && (
            <div className="text-center text-red-400 p-2">
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={e => {
          e.preventDefault()
          sendChat(input)
        }}
        className="p-4 border-t border-gray-700"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={formatMessage({ defaultMessage: "Ask me anything..." })}
            className="flex-1 bg-layer-2 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/80 disabled:opacity-50"
          >
            {isLoading ? "..." : <FormattedMessage defaultMessage="Send" />}
          </button>
        </div>
      </form>
    </FixedPage>
  )
}
