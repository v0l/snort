import { FormattedMessage } from "react-intl"

import { setStatus } from "@/ssr/state"

export default function NotFoundPage() {
  setStatus(404)
  return (
    <b className="error px-3 py-2">
      <FormattedMessage defaultMessage="Nothing found :/" />
    </b>
  )
}
