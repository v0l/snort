import { useState, ReactNode } from "react";
import { useSelector } from "react-redux";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";

import ChevronDown from "Icons/ChevronDown";
import { CollapsedIcon } from "Element/Collapsed";
import Copy from "Element/Copy";
import { RootState } from "State/Store";
import { hexToBech32 } from "Util";

import messages from "./messages";

interface CollapsedSectionProps {
  title: ReactNode;
  children: ReactNode;
}

const CollapsedSection = ({ title, children }: CollapsedSectionProps) => {
  const [collapsed, setCollapsed] = useState(true);
  const icon = (
    <div className={`collapse-icon ${collapsed ? "" : "flip"}`} onClick={() => setCollapsed(!collapsed)}>
      <ChevronDown />
    </div>
  );
  return (
    <div className="faq">
      <h3 onClick={() => setCollapsed(!collapsed)}>{title}</h3>
      <CollapsedIcon icon={icon} collapsed={collapsed}>
        {children}
      </CollapsedIcon>
    </div>
  );
};

const WhatIsSnort = () => {
  return (
    <CollapsedSection title={<FormattedMessage {...messages.WhatIsSnort} />}>
      <p>
        <FormattedMessage {...messages.WhatIsSnortIntro} />
      </p>
      <p>
        <FormattedMessage {...messages.WhatIsSnortNotes} />
      </p>
      <p>
        <FormattedMessage {...messages.WhatIsSnortExperience} />
      </p>
    </CollapsedSection>
  );
};

const HowDoKeysWork = () => {
  return (
    <CollapsedSection title={<FormattedMessage {...messages.HowKeysWork} />}>
      <p>
        <FormattedMessage {...messages.DigitalSignatures} />
      </p>
      <p>
        <FormattedMessage {...messages.TamperProof} />
      </p>
      <p>
        <FormattedMessage {...messages.Bitcoin} />
      </p>
    </CollapsedSection>
  );
};

const Extensions = () => {
  return (
    <CollapsedSection title={<FormattedMessage {...messages.ImproveSecurity} />}>
      <p>
        <FormattedMessage {...messages.Extensions} />
      </p>
      <ul>
        <li>
          <a href="https://getalby.com/" target="_blank" rel="noreferrer">
            Alby
          </a>
        </li>
        <li>
          <a href="https://github.com/fiatjaf/nos2x" target="_blank" rel="noreferrer">
            nos2x
          </a>
        </li>
      </ul>
      <p>
        <FormattedMessage {...messages.ExtensionsNostr} />
      </p>
    </CollapsedSection>
  );
};

export default function NewUserFlow() {
  const { publicKey, privateKey } = useSelector((s: RootState) => s.login);
  const navigate = useNavigate();

  return (
    <div className="main-content new-user">
      <div className="progress-bar">
        <div className="progress progress-first"></div>
      </div>
      <h1>
        <FormattedMessage {...messages.SaveKeys} />
      </h1>
      <p>
        <FormattedMessage {...messages.SaveKeysHelp} />
      </p>
      <h2>
        <FormattedMessage {...messages.YourPubkey} />
      </h2>
      <Copy text={hexToBech32("npub", publicKey ?? "")} />
      <h2>
        <FormattedMessage {...messages.YourPrivkey} />
      </h2>
      <Copy text={hexToBech32("nsec", privateKey ?? "")} />
      <div className="next-actions">
        <button type="button" onClick={() => navigate("/new/username")}>
          <FormattedMessage {...messages.KeysSaved} />{" "}
        </button>
      </div>
      <WhatIsSnort />
      <HowDoKeysWork />
      <Extensions />
    </div>
  );
}
