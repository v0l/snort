import { findTag, type TaggedNostrEvent } from "@snort/system"
import { FormattedMessage } from "react-intl"

import Icon from "@/Components/Icons/Icon"

export interface DVMJobFeedbackProps {
  ev: TaggedNostrEvent
}

export default function DVMJobFeedback({ ev }: DVMJobFeedbackProps) {
  const status = findTag(ev, "status")?.toLowerCase()

  function renderStatusMessage() {
    switch (status) {
      case "payment-required":
        return (
          <div className="flex items-center gap-2 mb-3">
            <Icon name="zap" className="text-yellow-500" />
            <span className="font-semibold">
              <FormattedMessage defaultMessage="Payment Required" />
            </span>
          </div>
        )
      case "processing":
        return (
          <div className="flex items-center gap-2 mb-3">
            <Icon name="fingerprint" className="text-blue-500" />
            <span className="font-semibold">
              <FormattedMessage defaultMessage="Processing" />
            </span>
          </div>
        )
      case "success":
        return (
          <div className="flex items-center gap-2 mb-3">
            <Icon name="check" className="text-green-500" />
            <span className="font-semibold">
              <FormattedMessage defaultMessage="Success" />
            </span>
          </div>
        )
      case "error":
        return (
          <div className="flex items-center gap-2 mb-3">
            <Icon name="close" className="text-red-500" />
            <span className="font-semibold">
              <FormattedMessage defaultMessage="Error" />
            </span>
          </div>
        )
      case "partial":
        return (
          <div className="flex items-center gap-2 mb-3">
            <Icon name="close" className="text-orange-500" />
            <span className="font-semibold">
              <FormattedMessage defaultMessage="Partial" />
            </span>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="dvm-job-feedback">
      {renderStatusMessage()}

      {ev.content && (
        <div className="mt-3 text-sm whitespace-pre-wrap">{ev.content}</div>
      )}
    </div>
  )
}
