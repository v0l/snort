import { TaggedNostrEvent } from "@snort/system";
import { useState } from "react";
import { FormattedMessage } from "react-intl";

import CloseButton from "@/Components/Button/CloseButton";
import Modal from "@/Components/Modal/Modal";
import { ProxyImg } from "@/Components/ProxyImg";
import Username from "@/Components/User/Username";
import { findTag } from "@/Utils";

interface BadgeInfo {
  id: string;
  pubkey: string;
  name?: string;
  description?: string;
  thumb?: string;
  image?: string;
}
export default function BadgeList({ badges }: { badges: TaggedNostrEvent[] }) {
  const [badgeModal, setShowModal] = useState<BadgeInfo>();
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
      thumb: (thumb?.length ?? 0 > 0) ? thumb : image,
      image,
    } as BadgeInfo;
  });
  return (
    <>
      <div className="flex items-center gap-1 flex-wrap">
        {badgeMetadata.map(v => (
          <ProxyImg
            alt={v.name}
            key={v.id}
            className="w-8 h-8 object-contain cursor-pointer"
            size={64}
            src={v.thumb}
            promptToLoadDirectly={false}
            onClick={() => setShowModal(v)}
            missingImageElement={
              <div className="w-8 h-8 bg-neutral-400 font-medium rounded-full flex items-center justify-center">?</div>
            }
          />
        ))}
      </div>
      {badgeModal && (
        <Modal id="badges-info" onClose={() => setShowModal(undefined)}>
          <div className="flex flex-col gap-2">
            <h2>
              <FormattedMessage defaultMessage="Badge Info" />
            </h2>
            <ProxyImg src={badgeModal.image} size={128} alt={badgeModal.name} />
            <h3>{badgeModal.name}</h3>
            <p>{badgeModal.description}</p>
            <div>
              <FormattedMessage
                defaultMessage="By: {author}"
                values={{ author: <Username pubkey={badgeModal.pubkey} onLinkVisit={() => setShowModal(undefined)} /> }}
              />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
