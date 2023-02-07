import "./BadgeList.css";

import { useState } from "react";
import { FormattedMessage } from "react-intl";

import { TaggedRawEvent } from "@snort/nostr";

import Icon from "Icons/Icon";
import Modal from "Element/Modal";
import Username from "Element/Username";
import { findTag } from "Util";

export default function BadgeList({ badges }: { badges: TaggedRawEvent[] }) {
  const [showModal, setShowModal] = useState(false);
  const badgeMetadata = badges.map(b => {
    const thumb = findTag(b, "thumb");
    const image = findTag(b, "image");
    const name = findTag(b, "name");
    const description = findTag(b, "description");
    return {
      id: b.id,
      pubkey: b.pubkey,
      name,
      description,
      img: thumb || image,
    };
  });
  return (
    <>
      <div className="badge-list" onClick={() => setShowModal(!showModal)}>
        {badgeMetadata.map(({ id, name, img }) => (
          <img alt={name} key={id} className="badge-item" src={img} />
        ))}
      </div>
      {showModal && (
        <Modal className="reactions-modal" onClose={() => setShowModal(false)}>
          <div className="reactions-view">
            <div className="close" onClick={() => setShowModal(false)}>
              <Icon name="close" />
            </div>
            <div className="reactions-header">
              <h2>
                <FormattedMessage defaultMessage="Badges" />
              </h2>
            </div>
            <div className="body">
              {badgeMetadata.map(({ id, name, pubkey, description, img }) => {
                return (
                  <div key={id} className="reactions-item">
                    <img className="reaction-icon" src={img} alt={name} />
                    <div className="badge-info">
                      <h3>{name}</h3>
                      <p>{description}</p>
                      <p>
                        <FormattedMessage
                          defaultMessage="By: {author}"
                          values={{ author: <Username pubkey={pubkey} onLinkVisit={() => setShowModal(false)} /> }}
                        />
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
