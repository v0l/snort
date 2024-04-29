import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import CloseButton from "../Button/CloseButton";
import Modal from "../Modal/Modal";
import AwardIcon from "./Award";

export function LeaderBadge() {
  const [showModal, setShowModal] = useState(false);
  return (
    <>
      <div
        className="flex gap-1 p-1 pr-2 items-center border border-[#5B2CB3] rounded-full"
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          setShowModal(true);
        }}>
        <AwardIcon size={16} />
        <div className="text-xs font-medium text-[#AC88FF]">
          <FormattedMessage defaultMessage="Community Leader" />
        </div>
      </div>
      {showModal && (
        <Modal onClose={() => setShowModal(false)} id="leaders">
          <div className="flex flex-col gap-4 items-center relative">
            <CloseButton className="absolute right-2 top-2" onClick={() => setShowModal(false)} />
            <AwardIcon size={80} />
            <div className="text-3xl font-semibold">
              <FormattedMessage defaultMessage="Community Leader" />
            </div>
            <p className="text-secondary">
              <FormattedMessage
                defaultMessage="Community leaders are individuals who grow the nostr ecosystem by being active in their local communities and helping onboard new users. Anyone can become a community leader, but few hold the current honorary title."
                id="f1OxTe"
              />
            </p>
            <Link to="/settings/invite">
              <button className="primary">
                <FormattedMessage defaultMessage="Become a leader" />
              </button>
            </Link>
          </div>
        </Modal>
      )}
    </>
  );
}
