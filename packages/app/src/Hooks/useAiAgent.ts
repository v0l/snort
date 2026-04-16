import { useRef, useCallback } from "react"
import {
  Agent,
  Runner,
  tool,
  setTracingDisabled,
  OpenAIChatCompletionsModel,
  type ModelProvider,
  RunItemStreamEvent,
  RunToolCallItem,
  RunToolCallOutputItem,
  Session,
  MemorySession
} from "@openai/agents"
import OpenAI from "openai"
import { z } from "zod"
import { RequestBuilder, type UserMetadata } from "@snort/system"
import { SnortSystemPrompt } from "@/Agent/system-prompt"
import useEventPublisher from "./useEventPublisher"
import useProfileSearch from "./useProfileSearch"
import usePreferences from "./usePreferences"
import { hexToBech32 } from "@snort/shared"

class CustomModelProvider implements ModelProvider {
  private client: OpenAI
  private modelName: string

  constructor(apiUrl: string, apiKey: string | undefined, modelName: string) {
    this.client = new OpenAI({
      apiKey: apiKey || "not-needed",
      baseURL: apiUrl,
      dangerouslyAllowBrowser: true,
    })
    this.modelName = modelName
  }

  async getModel(modelName?: string) {
    return new OpenAIChatCompletionsModel(this.client, modelName || this.modelName)
  }
}

const AI_CONFIG = {
  apiUrl: "https://or.v0l.io/v1",
  model: "code",
  apiKey: "sk-215c78cfd59ec07b-a1f9a1-59a9fe61",
}

export type AiStreamEvent =
  | { type: "done" }
  | { type: "text"; content: string }
  | { type: "thinking"; content: string }
  | { type: "tool_call"; name: string; args: object | undefined }
  | { type: "tool_result"; name: string; result: object | string | undefined }

export interface ChatHistoryItem {
  role: "user" | "assistant"
  content: string
}

interface AgentInstance {
  agent: Agent
  runner: Runner
  session: Session
}

export function useAiAgent() {
  const agentRef = useRef<AgentInstance | null>(null)
  const { publisher, system } = useEventPublisher()
  const search = useProfileSearch()
  const agentConfig = usePreferences(s => ({
    url: s.agentUrl,
    key: s.agentKey,
  }))

  const getOrCreate = useCallback(() => {
    if (agentRef.current) return agentRef.current

    setTracingDisabled(true)

    const apiUrl = agentConfig.url || AI_CONFIG.apiUrl
    const apiKey = agentConfig.key || AI_CONFIG.apiKey
    const modelProvider = new CustomModelProvider(apiUrl, apiKey, AI_CONFIG.model)
    const runner = new Runner({ modelProvider })

    const tools = [
      tool({
        name: "create_event",
        description: "Create a new Nostr event",
        parameters: z.object({
          content: z.string().describe("The content of the event"),
          kind: z.number().describe("The event kind number"),
          tags: z.array(z.array(z.string())).optional().describe("Nostr tags, for referencing other events / users, optional"),
          created_at: z.number().optional().describe("Created timestamp as unix seconds, optional")
        }).describe("Unsigned nostr event"),
        execute: async input => {
          try {
            const es = await publisher?.generic(eb => {
              for (const [k, v] of Object.entries(input)) {
                switch (k) {
                  case "created_at": {
                    if (typeof v === "number") {
                      eb.createdAt(v);
                      break;
                    } else {
                      throw "Created at must be a number"
                    }
                  }
                  case "kind": {
                    if (typeof v === "number") {
                      eb.kind(v);
                      break;
                    } else {
                      throw "Kind must be a number"
                    }
                  }
                  case "content": {
                    if (typeof v === "string") {
                      eb.content(v)
                      break;
                    } else {
                      throw "Content must be a string"
                    }
                  }
                  case "tags": {
                    if (Array.isArray(v)) {
                      if (v.length === 0) break;
                      if ((v as Array<never>).every(b => Array.isArray(b))) {
                        for (const t of v as Array<Array<string>>) {
                          eb.tag(t)
                        }
                      }
                    } else {
                      throw "Tags must be 2d array of strings, each entry must have at least 2 items (k,v)"
                    }
                  }
                }
              }
              return eb
            })
            return JSON.stringify(es)
          } catch (error) {
            return `Error creating post: ${error instanceof Error ? error.message : String(error)}`
          }
        },
      }),
      tool({
        name: "search_username",
        description:
          "Search for users by name or NIP-05 using fuzzy matching. Returns matching profiles with their pubkeys, display names, and NIP-05 addresses. Use this when you need to find a user's profile before following them or mentioning them.",
        parameters: z.object({
          query: z.string().describe("Search query - user name, display name, or NIP-05 address"),
        }),
        execute: async input => {
          try {
            const results = search(input.query)
            if (!results || results.length === 0) {
              return "No users found"
            }
            const formatted = results.slice(0, 10).map(p => ({
              name: p.display_name || p.name || "Unknown",
              nip05: p.nip05 || "no nip05",
              pubkey: p.pubkey,
              npub: hexToBech32("npub", p.pubkey)
            }))
            return JSON.stringify(formatted)
          } catch (error) {
            return `Error searching users: ${error instanceof Error ? error.message : String(error)}`
          }
        },
      }),
      tool({
        name: "update_profile",
        description: "Update user profile information",
        parameters: z.object({
          displayName: z.string().nullable().describe("Display name"),
          bio: z.string().nullable().describe("Bio/note"),
          avatarUrl: z.string().nullable().describe("Profile image URL"),
          bannerUrl: z.string().nullable().describe("Banner image URL"),
          website: z.string().nullable().describe("Website URL"),
        }),
        execute: async input => {
          if (!publisher) return JSON.stringify({ error: "Not logged in, cannot update profile" })
          try {
            const profile: UserMetadata = {}
            if (input.displayName) profile.display_name = input.displayName
            if (input.bio) profile.about = input.bio
            if (input.avatarUrl) profile.picture = input.avatarUrl
            if (input.bannerUrl) profile.banner = input.bannerUrl
            if (input.website) profile.website = input.website
            const event = await publisher.metadata(profile)
            return JSON.stringify(event)
          } catch (error) {
            return `Error updating profile: ${error instanceof Error ? error.message : String(error)}`
          }
        },
      }),
      tool({
        name: "query_nostr",
        description:
          "Query the local relay for Nostr events using REQ filters. IMPORTANT: authors must be 64-char hex pubkeys, NOT npub/nip05. Use 'search' for names.",
        parameters: z.object({
          filters: z
            .array(z.record(z.string(), z.any()))
            .describe(
              "Array of Nostr REQ filter objects with keys: authors (hex only!), kinds, ids, #e, #p, #t, search, since, until",
            ),
          timeout: z
            .union([z.number(), z.string()])
            .nullable()
            .optional()
            .describe("Optional: timeout in ms (default 10000)"),
        }),
        execute: async input => {
          try {
            const req = new RequestBuilder(`ai-query-${Date.now()}`)
            const timeout = (input.timeout as number | string) || 10000
            req.withOptions({ timeout: typeof timeout === "string" ? parseInt(timeout, 10) : timeout })
            for (const f of input.filters) {
              req.withBareFilter(f)
            }
            const events = await system.Fetch(req)
            const count = events ? events.length : 0
            if (count === 0)
              return JSON.stringify({
                type: "query",
                filters: input.filters,
                count: 0,
                note: "No events found matching your query",
              })
            return JSON.stringify(events)
          } catch (error) {
            return `Error querying Nostr: ${error instanceof Error ? error.message : String(error)}`
          }
        },
      }),
      tool({
        name: "update_preferences",
        description: "Update application preferences",
        parameters: z.object({
          theme: z.enum(["light", "dark", "auto"]).nullable().describe("Theme preference"),
          language: z.string().nullable().describe("Language preference"),
          notificationsEnabled: z.boolean().nullable().describe("Enable/disable notifications"),
          showNsfw: z.boolean().nullable().describe("Show NSFW content"),
        }),
        execute: async () => JSON.stringify({ type: "preferences", note: "not yet implemented" }),
      }),
    ]

    let systemPrompt = SnortSystemPrompt
    if (publisher?.pubKey) {
      systemPrompt += `\nThe currently logged in user pubkey is ${publisher.pubKey}`
    }
    const agent = new Agent({
      name: "Snort AI Assistant",
      instructions: systemPrompt,
      tools,
    })
    const newAgent = {
      agent,
      runner,
      session: new MemorySession(),
    }
    agentRef.current = newAgent

    return newAgent
  }, [publisher, system, agentConfig])

  const runStream = useCallback(
    async function* (message: string): AsyncGenerator<AiStreamEvent> {
      const { agent, runner, session } = getOrCreate()

      const stream = await runner.run(agent, message, { stream: true, session: session } as const)

      for await (const event of stream) {
        if (event.type === "raw_model_stream_event") {
          const data = (event as unknown as { data: Record<string, unknown> }).data
          if (!data) continue

          if (data.type === "output_text_delta" && typeof data.delta === "string") {
            yield { type: "text", content: data.delta }
          } else if (data.type === "model") {
            const chunk = data.event as {
              choices?: Array<{ delta?: { content?: string; reasoning?: string; reasoning_content?: string } }>
            }
            const delta = chunk?.choices?.[0]?.delta
            const reasoning = delta?.reasoning || delta?.reasoning_content
            if (reasoning) {
              yield { type: "thinking", content: reasoning }
            }
          }
        } else if (event instanceof RunItemStreamEvent) {
          console.debug("RAW AGENT MSG:", event)
          switch (event.name) {
            case "tool_called": {
              const toolCall = event.item as RunToolCallItem
              if ("name" in toolCall.rawItem && "arguments" in toolCall.rawItem) {
                let args = {}
                try {
                  args = JSON.parse(toolCall.rawItem.arguments as string)
                } catch { }
                yield { type: "tool_call", name: toolCall.rawItem.name, args }
              } else {
                debugger
              }
              break
            }
            case "tool_output": {
              const toolOutput = event.item as RunToolCallOutputItem
              let result: object | string | undefined = undefined
              if (toolOutput.output) {
                if (typeof toolOutput.output === "string") {
                  try {
                    result = JSON.parse(toolOutput.output)
                  } catch {
                    result = toolOutput.output
                  }
                } else {
                  result = toolOutput.output
                }
              }
              yield {
                type: "tool_result",
                name: "name" in event.item.rawItem ? (event.item.rawItem.name as string) : event.item.rawItem.id!,
                result: result,
              }
              break
            }
            default: {
              console.warn("Unhandeled event item", event)
            }
          }
        }
      }
      yield {
        type: "done",
      }
    },
    [getOrCreate],
  )

  return { runStream }
}
