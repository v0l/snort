import { FormattedMessage } from "react-intl";

import { ApiHost } from "Const";
import Nip5Service from "Element/Nip5Service";

import messages from "./messages";

import "./Verification.css";

export const SnortNostrAddressService = {
  name: "Snort",
  service: `${ApiHost}/api/v1/n5sp`,
  link: "https://snort.social/",
  supportLink: "https://snort.social/help",
  about: <FormattedMessage {...messages.SnortSocialNip} />,
};

export const Nip5Services = [
  SnortNostrAddressService,
  {
    name: "Nostr Plebs",
    service: "https://nostrplebs.com/api/v1",
    link: "https://nostrplebs.com/",
    supportLink: "https://nostrplebs.com/manage",
    about: <FormattedMessage {...messages.NostrPlebsNip} />,
  },
];

export default function VerificationPage() {
  return (
    <div className="main-content verification">
      <h2>
        <FormattedMessage {...messages.GetVerified} />
      </h2>
      <p>
        <FormattedMessage {...messages.Nip05} />
      </p>
      <p>
        <FormattedMessage {...messages.Nip05Pros} />
      </p>
      <ul>
        <li>
          <FormattedMessage {...messages.AvoidImpersonators} />
        </li>
        <li>
          <FormattedMessage {...messages.EasierToFind} />
        </li>
        <li>
          <FormattedMessage {...messages.Funding} />
        </li>
      </ul>

      {Nip5Services.map(a => (
        <Nip5Service key={a.name} {...a} />
      ))}
    </div>
  );
}
