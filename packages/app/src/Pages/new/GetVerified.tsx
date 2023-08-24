import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";
import { useUserProfile } from "@snort/system-react";

import Logo from "Element/Logo";
import { Nip5Services } from "Pages/NostrAddressPage";
import Nip5Service from "Element/Nip5Service";
import ProfileImage from "Element/ProfileImage";
import useLogin from "Hooks/useLogin";

import messages from "./messages";

export default function GetVerified() {
  const navigate = useNavigate();
  const { publicKey } = useLogin();
  const user = useUserProfile(publicKey);
  const [isVerified, setIsVerified] = useState(false);
  const name = user?.name || "nostrich";
  const [nip05, setNip05] = useState(`${name}@snort.social`);

  const onNext = async () => {
    navigate("/new/import");
  };

  return (
    <div className="main-content new-user" dir="auto">
      <Logo />
      <div className="progress-bar">
        <div className="progress progress-third"></div>
      </div>
      <h1>
        <FormattedMessage {...messages.Identifier} />
      </h1>
      <div className="next-actions continue-actions">
        <button className="secondary" type="button" onClick={onNext}>
          <FormattedMessage {...messages.Skip} />
        </button>
      </div>
      <h4>
        <FormattedMessage {...messages.PreviewOnSnort} />
      </h4>
      <div className="profile-preview-nip">
        {publicKey && <ProfileImage pubkey={publicKey} defaultNip={nip05} verifyNip={false} />}
      </div>
      <p>
        <FormattedMessage {...messages.IdentifierHelp} />
      </p>
      <ul>
        <li>
          <FormattedMessage {...messages.PreventFakes} />
        </li>
        <li>
          <FormattedMessage {...messages.EasierToFind} />
        </li>
        <li>
          <FormattedMessage {...messages.Funding} />
        </li>
      </ul>
      <p className="warning">
        <FormattedMessage {...messages.NameSquatting} />
      </p>
      {!isVerified && (
        <>
          <h2>
            <FormattedMessage {...messages.GetSnortId} />
          </h2>
          <p>
            <FormattedMessage {...messages.GetSnortIdHelp} />
          </p>
          <div className="nip-container">
            <Nip5Service
              key="snort"
              {...Nip5Services[0]}
              helpText={false}
              onChange={setNip05}
              onSuccess={() => setIsVerified(true)}
            />
          </div>
        </>
      )}
      {!isVerified && (
        <>
          <h2>
            <FormattedMessage {...messages.GetPartnerId} />
          </h2>
          <p>
            <FormattedMessage {...messages.GetPartnerIdHelp} />
          </p>
          <div className="nip-container">
            <Nip5Service
              key="nostrplebs"
              {...Nip5Services[1]}
              helpText={false}
              onChange={setNip05}
              onSuccess={() => setIsVerified(true)}
            />
          </div>
        </>
      )}
      <div className="next-actions">
        {!isVerified && (
          <button type="button" className="transparent" onClick={onNext}>
            <FormattedMessage {...messages.Skip} />
          </button>
        )}
        {isVerified && (
          <button type="button" onClick={onNext}>
            <FormattedMessage {...messages.Next} />
          </button>
        )}
      </div>
    </div>
  );
}
