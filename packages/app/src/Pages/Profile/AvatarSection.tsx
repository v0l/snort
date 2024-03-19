import { LNURL } from "@snort/shared";
import { CachedMetadata, encodeTLVEntries, NostrPrefix, TLVEntryType } from "@snort/system";
import React, { useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Link, useNavigate } from "react-router-dom";

import IconButton from "@/Components/Button/IconButton";
import Copy from "@/Components/Copy/Copy";
import Modal from "@/Components/Modal/Modal";
import QrCode from "@/Components/QrCode";
import { SpotlightMediaModal } from "@/Components/Spotlight/SpotlightMedia";
import Avatar from "@/Components/User/Avatar";
import FollowButton from "@/Components/User/FollowButton";
import ProfileImage from "@/Components/User/ProfileImage";
import ZapModal from "@/Components/ZapModal/ZapModal";
import { hexToBech32 } from "@/Utils";
import { LoginSessionType, LoginStore } from "@/Utils/Login";
import { ZapTarget } from "@/Utils/Zapper";

const AvatarSection = ({
  user,
  id,
  loginPubKey,
  readonly,
  lnurl,
}: {
  user?: CachedMetadata;
  id?: string;
  loginPubKey?: string;
  lnurl?: LNURL;
  readonly?: boolean;
}) => {
  const [showProfileQr, setShowProfileQr] = useState<boolean>(false);
  const [modalImage, setModalImage] = useState<string>("");
  const [showLnQr, setShowLnQr] = useState<boolean>(false);
  const profileId = useMemo(() => hexToBech32(CONFIG.profileLinkPrefix, id), [id]);
  const navigate = useNavigate();
  const isMe = loginPubKey === id;
  const canWrite = !!loginPubKey && !readonly;
  const intl = useIntl();

  const renderButtons = () => {
    if (!id) return null;

    return (
      <>
        <IconButton onClick={() => setShowProfileQr(true)} icon={{ name: "qr", size: 16 }} />
        {showProfileQr && (
          <Modal id="profile-qr" className="qr-modal" onClose={() => setShowProfileQr(false)}>
            <ProfileImage pubkey={id} />
            <div className="flex flex-col items-center">
              <QrCode data={`nostr:${profileId}`} className="m10" />
              <Copy text={profileId} className="py-3" />
            </div>
          </Modal>
        )}
        {isMe ? (
          <>
            <Link className="md:hidden" to="/settings">
              <button>
                <FormattedMessage defaultMessage="Settings" id="D3idYv" />
              </button>
            </Link>
            <Link className="hidden md:inline" to="/settings/profile">
              <button>
                <FormattedMessage defaultMessage="Edit" id="wEQDC6" />
              </button>
            </Link>
          </>
        ) : (
          <>
            {lnurl && <IconButton onClick={() => setShowLnQr(true)} icon={{ name: "zap", size: 16 }} />}
            {canWrite && (
              <IconButton
                onClick={() =>
                  navigate(
                    `/messages/${encodeTLVEntries("chat4" as NostrPrefix, {
                      type: TLVEntryType.Author,
                      length: 32,
                      value: id,
                    })}`,
                  )
                }
                icon={{ name: "envelope", size: 16 }}
              />
            )}
            {!canWrite && !isMe && (
              <IconButton
                onClick={() => {
                  if (confirm(intl.formatMessage({ defaultMessage: "View as user?", id: "LBAnc7" }))) {
                    LoginStore.loginWithPubkey(id, LoginSessionType.PublicKey);
                  }
                }}
                icon={{ name: "openeye", size: 16, className: "translate-y-0.5" }}
              />
            )}
          </>
        )}
      </>
    );
  };

  return (
    <div className="flex justify-between w-full">
      <Avatar
        pubkey={id ?? ""}
        user={user}
        onClick={() => setModalImage(user?.picture || "")}
        className="pointer"
        size={100}
      />
      <div className="profile-actions">
        {renderButtons()}
        {!isMe && id && <FollowButton pubkey={id} />}
      </div>
      {modalImage && <SpotlightMediaModal onClose={() => setModalImage("")} media={[modalImage]} idx={0} />}
      <ZapModal
        targets={
          lnurl?.lnurl && id
            ? [
                {
                  type: "lnurl",
                  value: lnurl.lnurl,
                  weight: 1,
                  name: user?.display_name || user?.name,
                  zap: { pubkey: id, anon: false },
                } as ZapTarget,
              ]
            : undefined
        }
        show={showLnQr}
        onClose={() => setShowLnQr(false)}
      />
    </div>
  );
};

export default AvatarSection;
