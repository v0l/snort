import { FormattedMessage } from "react-intl"

export default function NotFoundPage() {
  return (
    <b className="error px-3 py-2">
      <FormattedMessage defaultMessage="Nothing found :/" />
    </b>
  )
}
