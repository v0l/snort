import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";

import { services } from "Pages/Verification";
import Nip5Service from "Element/Nip5Service";
import ProfileImage from "Element/ProfileImage";

import messages from "./messages";

export default function GetVerified() {
  const navigate = useNavigate();

  const onNext = async () => {
    navigate("/new/import");
  };

  return (
    <div className="main-content new-user">
      <div className="progress-bar">
        <div className="progress progress-third"></div>
      </div>
      <h1>
        <FormattedMessage {...messages.Identifier} />
      </h1>
      <h4>
        <FormattedMessage {...messages.PreviewOnSnort} />
      </h4>
      <div className="profile-preview-nip">
        <ProfileImage pubkey="63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed" />
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
      <h2>
        <FormattedMessage {...messages.GetSnortId} />
      </h2>
      <p>
        <FormattedMessage {...messages.GetSnortIdHelp} />
      </p>
      <div className="nip-container">
        <Nip5Service key="snort" {...services[0]} helpText={false} />
      </div>
      <h2>
        <FormattedMessage {...messages.GetPartnerId} />
      </h2>
      <p>
        <FormattedMessage {...messages.GetPartnerIdHelp} />
      </p>
      <div className="nip-container">
        <Nip5Service key="nostrplebs" {...services[1]} helpText={false} />
      </div>
      <div className="next-actions">
        <button type="button" className="transparent" onClick={onNext}>
          <FormattedMessage {...messages.Skip} />
        </button>
      </div>
    </div>
  );
}
