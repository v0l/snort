import "./BadgeList.css";

import { useState } from "react";
import { FormattedMessage } from "react-intl";

import { TaggedNostrEvent } from "@snort/system";

import { ProxyImg } from "Element/ProxyImg";
import Icon from "Icons/Icon";
import Modal from "Element/Modal";
import Username from "Element/User/Username";
import { findTag } from "SnortUtils";

export default function BadgeList({ badges }: { badges: TaggedNostrEvent[] }) {
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
      thumb: thumb?.length ?? 0 > 0 ? thumb : image,
      image,
    };
  });
  return (
    <>
      <div className="badge-list" onClick={() => setShowModal(!showModal)}>
        {badgeMetadata.slice(0, 8).map(({ id, name, thumb }) => (
          <ProxyImg alt={name} key={id} className="badge-item" size={64} src={thumb} />
        ))}
      </div>
      {showModal && (
        <Modal id="badges" className="reactions-modal" onClose={() => setShowModal(false)}>
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
              {badgeMetadata.map(({ id, name, pubkey, description, image }) => {
                return (
                  <div key={id} className="reactions-item badges-item">
                    <ProxyImg className="reaction-icon" src={image} size={64} alt={name} />
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
