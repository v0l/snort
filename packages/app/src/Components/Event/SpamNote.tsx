import { useState } from "react"
import { FormattedMessage } from "react-intl"

const SpamNote = ({ children }: { children: React.ReactNode }) => {
  const [show, setShow] = useState(false)

  return show ? (
    children
  ) : (
    <div className="bb px-3 py-2 flex items-center justify-between">
      <div className="text-sm text-neutral-400">
        <FormattedMessage defaultMessage="This reply looks like spam" />
      </div>
      <button type="button" className="btn btn-sm btn-neutral" onClick={() => setShow(true)}>
        <FormattedMessage defaultMessage="Show" />
      </button>
    </div>
  )
}

export default SpamNote
