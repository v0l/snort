import FormattedMessage from "Element/FormattedMessage";
import { useNavigate } from "react-router-dom";

import Logo from "Element/Logo";
import { CollapsedSection } from "Element/Collapsed";
import Copy from "Element/Copy";
import { hexToBech32 } from "SnortUtils";
import { hexToMnemonic } from "nip6";
import useLogin from "Hooks/useLogin";
import { PROFILE } from ".";
import { DefaultPreferences, LoginStore, updatePreferences } from "Login";
import { AllLanguageCodes } from "Pages/settings/Preferences";

import messages from "./messages";

const WhatIsSnort = () => {
  return (
    <CollapsedSection
      title={
        <h3>
          <FormattedMessage {...messages.WhatIsSnort} />
        </h3>
      }>
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
    <CollapsedSection
      title={
        <h3>
          <FormattedMessage {...messages.HowKeysWork} />
        </h3>
      }>
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
  const { preferences } = useLogin();
  return (
    <CollapsedSection
      title={
        <h3>
          <FormattedMessage {...messages.ImproveSecurity} />
        </h3>
      }>
      <p>
        <FormattedMessage {...messages.Extensions} />
      </p>
      <ul>
        <li>
          <a href="https://getalby.com/" target="_blank" rel="noreferrer">
            Alby
          </a>
          {(preferences.language === "ru" || preferences.language === "ru-RU") && (
            <a href="https://nostr.21ideas.org/docs/guides/Alby.html" target="_blank" rel="noreferrer">
              (Tony's Guide)
            </a>
          )}
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
  const login = useLogin();
  const navigate = useNavigate();

  return (
    <div className="main-content new-user p" dir="auto">
      <Logo />
      <div className="progress-bar">
        <div className="progress progress-first"></div>
      </div>
      <h1>
        <FormattedMessage {...messages.SaveKeys} />
      </h1>
      <div className="flex f-space">
        <FormattedMessage defaultMessage="Language" />
        <select
          value={login.preferences.language || DefaultPreferences.language}
          onChange={e =>
            updatePreferences(login, {
              ...login.preferences,
              language: e.target.value,
            })
          }
          style={{ textTransform: "capitalize" }}>
          {AllLanguageCodes.sort().map(a => (
            <option value={a}>
              {new Intl.DisplayNames([a], {
                type: "language",
              }).of(a)}
            </option>
          ))}
        </select>
      </div>
      <p>
        <FormattedMessage {...messages.SaveKeysHelp} />
      </p>
      <h2>
        <FormattedMessage {...messages.YourPubkey} />
      </h2>
      <Copy text={hexToBech32("npub", login.publicKey ?? "")} />
      <h2>
        <FormattedMessage {...messages.YourMnemonic} />
      </h2>
      <Copy text={hexToMnemonic(login.generatedEntropy ?? "")} />
      <div className="next-actions">
        <button
          type="button"
          onClick={() => {
            LoginStore.updateSession({
              ...login,
              generatedEntropy: undefined,
            });
            navigate(PROFILE);
          }}>
          <FormattedMessage {...messages.KeysSaved} />{" "}
        </button>
      </div>
      <WhatIsSnort />
      <HowDoKeysWork />
      <Extensions />
    </div>
  );
}
