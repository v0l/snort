import { useState } from "react"
import { FormattedMessage } from "react-intl"
import { Link } from "react-router-dom"

import CloseButton from "../Button/CloseButton"
import Modal from "../Modal/Modal"
import AwardIcon from "./Award"

export function LeaderBadge() {
  const [showModal, setShowModal] = useState(false)
  return (
    <>
      <button
        type="button"
        className="flex gap-1 p-1 pr-2 items-center border border-[#5B2CB3] rounded-full bg-transparent m-0 cursor-pointer hover:opacity-90"
        onClick={e => {
          e.preventDefault()
          e.stopPropagation()
          setShowModal(true)
        }}
      >
        <AwardIcon size={16} />
        <div className="text-xs font-medium text-[#AC88FF]">
          <FormattedMessage defaultMessage="Community Leader" />
        </div>
      </button>
      {showModal && (
        <Modal onClose={() => setShowModal(false)} id="leaders">
          <div className="flex flex-col gap-4 items-center relative">
            <CloseButton className="absolute right-2 top-2" onClick={() => setShowModal(false)} />
            <AwardIcon size={80} />
            <div className="text-3xl font-semibold">
              <FormattedMessage defaultMessage="Community Leader" />
            </div>
            <p className="text-neutral-400">
              <FormattedMessage defaultMessage="Community leaders are individuals who grow the nostr ecosystem by being active in their local communities and helping onboard new users. Anyone can become a community leader, but few hold the current honorary title." />
            </p>
            <Link to="/settings/invite">
              <button type="button" className="primary">
                <FormattedMessage defaultMessage="Become a leader" />
              </button>
            </Link>
          </div>
        </Modal>
      )}
    </>
  )
}
