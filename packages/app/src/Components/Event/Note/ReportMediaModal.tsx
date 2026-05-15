import { type NostrEvent, readNip94Tags } from "@snort/system"
import { useState } from "react"
import { FormattedMessage } from "react-intl"
import Modal from "@/Components/Modal/Modal"
import Icon from "@/Components/Icons/Icon"
import useEventPublisher from "@/Hooks/useEventPublisher"
import { blossomReport } from "@/Utils/Upload/blossom"
import { dedupe, isHex } from "@snort/shared"
import useBlossomServers from "@/Hooks/useBlossomServers"

interface ReportMediaModalProps {
  event: NostrEvent
  onClose: () => void
}

export function hasReportableMedia(event: NostrEvent): boolean {
  // Extract media from NIP-94 tags and content
  const nip94Tags = readNip94Tags(event.tags)

  if (nip94Tags.url && nip94Tags.hash && isHex(nip94Tags.hash)) {
    return true
  }

  if (!event.content || typeof event.content !== "string") {
    return false
  }

  const blossomUrlsFromContent = extractBlossomUrls(event.content)
  return blossomUrlsFromContent.length > 0
}

function extractBlossomUrls(content: string): Array<{ url: string; hash: string }> {
  const urls: Array<{ url: string; hash: string }> = []
  const urlRegex = /https?:\/\/[^\s<>"']+/g
  let match: RegExpExecArray | null

  while ((match = urlRegex.exec(content)) !== null) {
    const url = match[0]
    try {
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split("/").filter(Boolean)
      const lastPart = pathParts[pathParts.length - 1]
      const hashMatch = lastPart?.match(/^([a-fA-F0-9]{64})/)

      if (hashMatch && isHex(hashMatch[1])) {
        urls.push({
          url,
          hash: hashMatch[1],
        })
      }
    } catch {
      // Invalid URL, skip
    }
  }

  return urls
}

export default function ReportMediaModal({ event, onClose }: ReportMediaModalProps) {
  const { publisher } = useEventPublisher()
  const [showReportForm, setShowReportForm] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [reporting, setReporting] = useState(false)
  const [selectedHash, setSelectedHash] = useState<string | null>(null)
  const [reportResults, setReportResults] = useState<Map<string, boolean> | null>(null)

  // Extract media from NIP-94 tags and content
  const nip94Tags = readNip94Tags(event.tags)
  const blossomUrlsFromTags: Array<{ url: string; hash: string }> = []

  if (nip94Tags.url && nip94Tags.hash && isHex(nip94Tags.hash)) {
    blossomUrlsFromTags.push({
      url: nip94Tags.url,
      hash: nip94Tags.hash,
    })
    // Add fallback URLs from NIP-94 tags
    if (nip94Tags.fallback && nip94Tags.fallback.length > 0) {
      for (const fallbackUrl of nip94Tags.fallback) {
        try {
          const urlObj = new URL(fallbackUrl)
          const pathParts = urlObj.pathname.split("/").filter(Boolean)
          const lastPart = pathParts[pathParts.length - 1]
          const hashMatch = lastPart?.match(/^([a-fA-F0-9]{64})/)
          if (hashMatch && isHex(hashMatch[1]) && hashMatch[1] === nip94Tags.hash) {
            blossomUrlsFromTags.push({
              url: fallbackUrl,
              hash: nip94Tags.hash,
            })
          }
        } catch {
          // Invalid fallback URL, skip
        }
      }
    }
  }

  const blossomUrlsFromContent = extractBlossomUrls(event.content || "")
  const allBlossomUrls = dedupe([...blossomUrlsFromTags, ...blossomUrlsFromContent])

  // Load author's blossom servers (including fallback URLs)
  const blossomServers = useBlossomServers([event.pubkey])
  const authorServers = dedupe(Object.values(blossomServers).flat())

  // Extract origins from author servers
  const authorOrigins = dedupe(
    authorServers
      .filter(s => s && s.trim())
      .map(server => {
        try {
          return new URL(server).origin
        } catch {
          return server
        }
      }),
  )

  let origin = ""
  try {
    if (event.content && typeof event.content === "string" && event.content.trim()) {
      origin = new URL(event.content).origin
    }
  } catch {
    // Invalid URL, skip
  }

  // Combine author origins with event content origin and deduplicate
  const allServerUrls = dedupe([...authorOrigins, origin].filter(s => s && s.trim()))

  async function handleReport() {
    if (!publisher || !reportReason.trim() || !selectedHash) return

    setReporting(true)
    setReportResults(null)
    try {
      const serverUrls = allServerUrls.filter(s => s)
      if (serverUrls.length === 0) {
        setReporting(false)
        return
      }

      const results = await blossomReport(serverUrls, publisher, selectedHash, reportReason.trim())
      setReportResults(results)
      // Don't show alerts, just display results in the UI
    } catch (error) {
      console.error("Report failed:", error)
    } finally {
      setReporting(false)
    }
  }

  if (allBlossomUrls.length === 0) {
    return (
      <Modal id="report-media-modal" onClose={onClose}>
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">
            <FormattedMessage defaultMessage="Report Media" />
          </h2>
          <p className="text-neutral-500">
            <FormattedMessage defaultMessage="No media found in this note that can be reported." />
          </p>
          <button
            type="button"
            className="px-4 py-2 bg-neutral rounded hover:bg-neutral/80 transition-colors"
            onClick={onClose}
          >
            <FormattedMessage defaultMessage="Close" />
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal id="report-media-modal" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">
          <FormattedMessage defaultMessage="Report Media" />
        </h2>

        {!showReportForm ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-neutral-500">
              <FormattedMessage defaultMessage="Select media to report and submit to the server owner. This will create a Blossom report." />
            </p>

            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {allBlossomUrls.map(item => (
                <div
                  key={item.hash}
                  className={`p-3 border rounded cursor-pointer transition-colors ${
                    selectedHash === item.hash ? "border-primary bg-layer-2" : "border-neutral hover:border-neutral-400"
                  }`}
                  onClick={() => setSelectedHash(item.hash)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-16 bg-layer-3 rounded overflow-hidden flex-shrink-0">
                      <img
                        src={item.url}
                        alt="Media preview"
                        className="w-full h-full object-cover"
                        onError={e => {
                          e.currentTarget.style.display = "none"
                          e.currentTarget.parentElement!.classList.add(
                            "flex",
                            "items-center",
                            "justify-center",
                            "text-xs",
                          )
                          e.currentTarget.parentElement!.textContent = "Preview unavailable"
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-mono truncate">{item.hash}</div>
                      <div className="text-xs text-neutral-500 truncate">{item.url}</div>
                    </div>
                    <Icon
                      name={selectedHash === item.hash ? "check" : "circle"}
                      className={selectedHash === item.hash ? "text-primary" : "text-neutral-500"}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="px-4 py-2 bg-error text-white rounded hover:bg-error/80 transition-colors disabled:opacity-50"
              disabled={!selectedHash}
              onClick={() => setShowReportForm(true)}
            >
              <FormattedMessage defaultMessage="Report Selected" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="p-3 bg-layer-2 rounded">
              <div className="text-sm font-semibold mb-1">
                <FormattedMessage defaultMessage="Reporting:" />
              </div>
              <div className="text-xs font-mono break-all">{selectedHash}</div>
            </div>

            <div className="p-3 bg-layer-2 rounded">
              <div className="text-sm font-semibold mb-2">
                <FormattedMessage defaultMessage="Reports will be sent to:" />
              </div>
              <div className="text-xs text-neutral-500 max-h-32 overflow-y-auto">
                {allServerUrls.filter(s => s).length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {allServerUrls
                      .filter(s => s)
                      .map(server => (
                        <li key={server} className="truncate">
                          {server}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <FormattedMessage defaultMessage="No servers available" />
                )}
              </div>
            </div>

            <textarea
              className="w-full p-2 border rounded bg-layer-2 min-h-[100px]"
              placeholder="Describe why you're reporting this media (e.g., inappropriate content, copyright violation, etc.)"
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              disabled={reporting}
            />

            {reportResults && (
              <div className="p-3 bg-layer-2 rounded">
                <div className="text-sm font-semibold mb-2">
                  <FormattedMessage defaultMessage="Report Results:" />
                </div>
                <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
                  {Array.from(reportResults.entries()).map(([server, success]) => (
                    <div key={server} className="flex items-center gap-2">
                      <Icon
                        name={success ? "check" : "x-close"}
                        className={success ? "text-success" : "text-error"}
                        size={14}
                      />
                      <span className={success ? "text-success" : "text-error"}>{server}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80 transition-colors disabled:opacity-50 flex-1"
                onClick={handleReport}
                disabled={!reportReason.trim() || reporting}
              >
                {reporting ? (
                  <FormattedMessage defaultMessage="Submitting..." />
                ) : (
                  <FormattedMessage defaultMessage="Submit Report" />
                )}
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-neutral rounded hover:bg-neutral/80 transition-colors"
                onClick={() => {
                  setShowReportForm(false)
                  setReportReason("")
                  setReportResults(null)
                }}
                disabled={reporting}
              >
                <FormattedMessage defaultMessage="Cancel" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
