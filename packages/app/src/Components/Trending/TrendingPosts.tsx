import classNames from "classnames"
import { useMemo } from "react"

import { ErrorOrOffline } from "@/Components/ErrorOrOffline"
import Invoice from "@/Components/Embed/Invoice"
import Note from "@/Components/Event/EventComponent"
import PageSpinner from "@/Components/PageSpinner"
import TrendingNote from "@/Components/Trending/ShortNote"
import useModeration from "@/Hooks/useModeration"
import useContentDiscovery from "@/Hooks/useContentDiscovery"
import usePreferences from "@/Hooks/usePreferences"
import { findTag } from "@snort/system"

export default function TrendingNotes({ count = Infinity, small = false }: { count?: number; small?: boolean }) {
  const trendingDvmPubkey = usePreferences(p => p.trendingDvmPubkey)

  const serviceProvider = trendingDvmPubkey || "0d9ec486275b70f0c4faec277fc4c63b9f14cb1ca1ec029f7d76210e957e5257"
  const { data, error } = useContentDiscovery(serviceProvider)
  const { isEventMuted } = useModeration()

  const options = useMemo(
    () => ({
      showFooter: !small,
      showReactionsLink: !small,
      showMedia: !small,
      longFormPreview: !small,
      truncate: small,
      showContextMenu: !small,
    }),
    [small],
  )

  function getDVMInvoice(ev: any): string | undefined {
    const bolt11Tag = ev.tags.find((t: any[]) => t[0] === "bolt11")
    const bolt11 = bolt11Tag?.[1]
    if (bolt11) return bolt11
    const contentInvoice = ev.content.match(/lnbc[a-zA-Z0-9]+/)
    return contentInvoice?.[0]
  }

  function isDVMPaymentRequired(ev: any): boolean {
    if (ev.kind !== 7000) return false
    const status = findTag(ev, "status")?.toLowerCase()
    return status === "payment-required"
  }

  if (error && !data) return <ErrorOrOffline error={error} className="px-3 py-2" />

  const filteredAndLimitedPosts = data ? data.filter(a => !isEventMuted(a)).slice(0, count) : []

  const renderList = () => {
    if (data.length === 0) return <PageSpinner />
    return filteredAndLimitedPosts.map((e: any, index) => {
      // Show invoice for DVM payment-required events in non-small view
      // Once paid, the DVM processes the request and returns results via NIP-90 responses
      if (!small && isDVMPaymentRequired(e)) {
        const invoice = getDVMInvoice(e)
        if (invoice) {
          return (
            <div key={e.id} className="flex flex-col gap-4">
              <Note key={`note-${e.id}`} data={e} depth={0} options={options} waitUntilInView={index > 5} />
              <Invoice invoice={invoice} />
            </div>
          )
        }
      }
      return small ? (
        <TrendingNote key={e.id} event={e} />
      ) : (
        <Note key={e.id} data={e} depth={0} options={options} waitUntilInView={index > 5} />
      )
    })
  }

  return <div className={classNames("flex flex-col", { "gap-4 py-4": small })}>{renderList()}</div>
}
