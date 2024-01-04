import SnortApi from "@/External/SnortApi";
import { getCurrentRefCode, getDisplayName } from "@/Utils";
import { useUserProfile } from "@snort/system-react";
import Lottie from "lottie-react";
import { useState, useEffect } from "react";
import { FormattedMessage } from "react-intl";
import { Link, useNavigate } from "react-router-dom";
import Modal from "./Modal/Modal";
import Hugs from "@/hug.json";

const InviteModal = () => {
  const [pubkey, setPubkey] = useState("");
  const code = getCurrentRefCode();
  const navigate = useNavigate();
  useEffect(() => {
    if (code) {
      const api = new SnortApi();
      api.getRefCodeInfo(code).then(a => setPubkey(a.pubkey));
    }
  }, []);
  const profile = useUserProfile(pubkey);
  if (!code) return;

  function close() {
    navigate("/");
  }
  return (
    <Modal id="invite-modal" onClose={close}>
      <div className="flex flex-col gap-4 items-center">
        <Lottie animationData={Hugs} />
        <p className="text-3xl font-semibold">
          <FormattedMessage
            defaultMessage="{name} invited you to {app}"
            id="ZlmK/p"
            values={{
              name: <span className="text-primary">{getDisplayName(profile, pubkey)}</span>,
              app: CONFIG.appNameCapitalized,
            }}
          />
        </p>
        <Link to="/login/sign-up">
          <button className="primary">
            <FormattedMessage defaultMessage="Sign Up" id="39AHJm" />
          </button>
        </Link>
      </div>
    </Modal>
  );
};

export default InviteModal;
