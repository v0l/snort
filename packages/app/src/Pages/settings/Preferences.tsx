/* eslint-disable max-lines */
import "./Preferences.css";

import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import AsyncButton from "@/Components/Button/AsyncButton";
import { AllLanguageCodes } from "@/Components/IntlProvider/IntlProviderUtils";
import { useLocale } from "@/Components/IntlProvider/useLocale";
import { useAllPreferences } from "@/Hooks/usePreferences";
import { unwrap } from "@/Utils";
import { DefaultImgProxy } from "@/Utils/Const";
import { UserPreferences } from "@/Utils/Login";

import messages from "./messages";

const PreferencesPage = () => {
  const { formatMessage } = useIntl();
  const { preferences, update: updatePerf } = useAllPreferences();
  const [pref, setPref] = useState<UserPreferences>(preferences);
  const [error, setError] = useState("");
  const { lang } = useLocale();

  async function update(obj: UserPreferences) {
    try {
      setError("");
      await updatePerf(obj);
    } catch (e) {
      console.error(e);
      setError(formatMessage({ defaultMessage: "Failed to update, please try again", id: "OoZgbB" }));
    }
  }

  return (
    <div className="preferences flex flex-col g24">
      <h3>
        <FormattedMessage defaultMessage="Preferences" />
      </h3>
      <AsyncButton onClick={() => update(pref)}>
        <FormattedMessage defaultMessage="Save" />
      </AsyncButton>
      {error && <b className="warning">{error}</b>}
      <div className="flex justify-between w-max">
        <h4>
          <FormattedMessage defaultMessage="Language" />
        </h4>
        <div>
          <select
            value={pref.language ?? lang}
            onChange={e =>
              setPref({
                ...pref,
                language: e.target.value,
              })
            }
            style={{ textTransform: "capitalize" }}>
            {AllLanguageCodes.sort().map(a => (
              <option key={a} value={a}>
                {new Intl.DisplayNames([a], {
                  type: "language",
                }).of(a)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-between w-max">
        <h4>
          <FormattedMessage {...messages.Theme} />
        </h4>
        <div>
          <select
            value={pref.theme}
            onChange={e =>
              setPref({
                ...pref,
                theme: e.target.value,
              } as UserPreferences)
            }>
            <option value="system">
              <FormattedMessage {...messages.System} />
            </option>
            <option value="light">
              <FormattedMessage {...messages.Light} />
            </option>
            <option value="dark">
              <FormattedMessage {...messages.Dark} />
            </option>
          </select>
        </div>
      </div>
      <div className="flex justify-between w-max">
        <h4>
          <FormattedMessage {...messages.DefaultRootTab} />
        </h4>
        <div>
          <select
            value={pref.defaultRootTab}
            onChange={e =>
              setPref({
                ...pref,
                defaultRootTab: e.target.value,
              } as UserPreferences)
            }>
            <option value="for-you">
              <FormattedMessage defaultMessage="For you" />
            </option>
            <option value="following">
              <FormattedMessage defaultMessage="Notes" />
            </option>
            <option value="conversations">
              <FormattedMessage {...messages.Conversations} />
            </option>
            <option value="global">
              <FormattedMessage {...messages.Global} />
            </option>
          </select>
        </div>
      </div>
      <div className="flex justify-between w-max">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage defaultMessage="Send usage metrics" />
          </h4>
          <small>
            <FormattedMessage defaultMessage="Send anonymous usage metrics" />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={pref.telemetry ?? true}
            onChange={e => setPref({ ...pref, telemetry: e.target.checked })}
          />
        </div>
      </div>
      <div className="flex w-max">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage {...messages.AutoloadMedia} />
          </h4>
          <small>
            <FormattedMessage {...messages.AutoloadMediaHelp} />
          </small>
          <div className="w-max">
            <select
              className="w-max"
              value={pref.autoLoadMedia}
              onChange={e =>
                setPref({
                  ...pref,
                  autoLoadMedia: e.target.value,
                } as UserPreferences)
              }>
              <option value="none">
                <FormattedMessage {...messages.None} />
              </option>
              <option value="follows-only">
                <FormattedMessage {...messages.FollowsOnly} />
              </option>
              <option value="all">
                <FormattedMessage {...messages.All} />
              </option>
            </select>
          </div>
        </div>
      </div>
      <div className="flex justify-between w-max">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage defaultMessage="Check Signatures" />
          </h4>
          <small>
            <FormattedMessage defaultMessage="Check all event signatures received from relays" />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={pref.checkSigs}
            onChange={e => setPref({ ...pref, checkSigs: e.target.checked })}
          />
        </div>
      </div>
      <div className="flex justify-between w-max">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage defaultMessage="Auto Translate" />
          </h4>
          <small>
            <FormattedMessage defaultMessage="Automatically translate notes to your local language" />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={pref.autoTranslate}
            onChange={e => setPref({ ...pref, autoTranslate: e.target.checked })}
          />
        </div>
      </div>
      <div className="flex justify-between w-max">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage defaultMessage="Proof of Work" />
          </h4>
          <small>
            <FormattedMessage defaultMessage="Amount of work to apply to all published events" />
          </small>
        </div>
        <div>
          <input
            type="number"
            defaultValue={pref.pow}
            min={0}
            onChange={e => setPref({ ...pref, pow: parseInt(e.target.value || "0") })}
          />
        </div>
      </div>
      <div className="flex justify-between w-max">
        <h4>
          <FormattedMessage defaultMessage="Default Zap amount" />
        </h4>
        <div>
          <input
            type="number"
            defaultValue={pref.defaultZapAmount}
            min={1}
            onChange={e => setPref({ ...pref, defaultZapAmount: parseInt(e.target.value || "0") })}
          />
        </div>
      </div>
      <div className="flex justify-between w-max">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage defaultMessage="Show Badges" />
          </h4>
          <small>
            <FormattedMessage defaultMessage="Show badges on profile pages" />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={pref.showBadges ?? false}
            onChange={e => setPref({ ...pref, showBadges: e.target.checked })}
          />
        </div>
      </div>
      <div className="flex justify-between w-max">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage defaultMessage="Show Status" />
          </h4>
          <small>
            <FormattedMessage defaultMessage="Show status messages on profile pages" />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={pref.showStatus ?? true}
            onChange={e => setPref({ ...pref, showStatus: e.target.checked })}
          />
        </div>
      </div>
      <div className="flex justify-between w-max">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage defaultMessage="Auto Zap" />
          </h4>
          <small>
            <FormattedMessage defaultMessage="Automatically zap every note when loaded" />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={pref.autoZap}
            onChange={e => setPref({ ...pref, autoZap: e.target.checked })}
          />
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex justify-between">
          <div className="flex flex-col g8">
            <h4>
              <FormattedMessage {...messages.ImgProxy} />
            </h4>
            <small>
              <FormattedMessage {...messages.ImgProxyHelp} />
            </small>
          </div>
          <div>
            <input
              type="checkbox"
              checked={pref.imgProxyConfig !== null}
              onChange={e =>
                setPref({
                  ...pref,
                  imgProxyConfig: e.target.checked ? DefaultImgProxy : undefined,
                })
              }
            />
          </div>
        </div>
        {pref.imgProxyConfig && (
          <div className="w-max form">
            <div className="form-group">
              <div>
                <FormattedMessage {...messages.ServiceUrl} />
              </div>
              <div className="w-max">
                <input
                  type="text"
                  value={pref.imgProxyConfig?.url}
                  placeholder={formatMessage({
                    defaultMessage: "URL..",
                    id: "cQfLWb",
                    description: "Placeholder text for imgproxy url textbox",
                  })}
                  onChange={e =>
                    setPref({
                      ...pref,
                      imgProxyConfig: {
                        ...unwrap(pref.imgProxyConfig),
                        url: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
            <div className="form-group">
              <div>
                <FormattedMessage {...messages.ServiceKey} />
              </div>
              <div className="w-max">
                <input
                  type="password"
                  value={pref.imgProxyConfig?.key}
                  placeholder={formatMessage({
                    defaultMessage: "Hex Key..",
                    id: "H+vHiz",
                    description: "Hexidecimal 'key' input for improxy",
                  })}
                  onChange={e =>
                    setPref({
                      ...pref,
                      imgProxyConfig: {
                        ...unwrap(pref.imgProxyConfig),
                        key: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
            <div className="form-group">
              <div>
                <FormattedMessage {...messages.ServiceSalt} />
              </div>
              <div className="w-max">
                <input
                  type="password"
                  value={pref.imgProxyConfig?.salt}
                  placeholder={formatMessage({
                    defaultMessage: "Hex Salt..",
                    id: "TpgeGw",
                    description: "Hexidecimal 'salt' input for imgproxy",
                  })}
                  onChange={e =>
                    setPref({
                      ...pref,
                      imgProxyConfig: {
                        ...unwrap(pref.imgProxyConfig),
                        salt: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-between w-max">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage {...messages.EnableReactions} />
          </h4>
          <small>
            <FormattedMessage {...messages.EnableReactionsHelp} />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={pref.enableReactions}
            onChange={e => setPref({ ...pref, enableReactions: e.target.checked })}
          />
        </div>
      </div>
      <div className="flex flex-col g8">
        <h4>
          <FormattedMessage {...messages.ReactionEmoji} />
        </h4>
        <small>
          <FormattedMessage {...messages.ReactionEmojiHelp} />
        </small>
        <input
          type="text"
          value={pref.reactionEmoji}
          onChange={e => {
            const split = e.target.value.match(/[\p{L}\S]{1}/u);
            setPref({
              ...pref,
              reactionEmoji: split?.[0] ?? "",
            });
          }}
        />
      </div>
      <div className="flex justify-between">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage {...messages.ConfirmReposts} />
          </h4>
          <small>
            <FormattedMessage {...messages.ConfirmRepostsHelp} />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={pref.confirmReposts}
            onChange={e => setPref({ ...pref, confirmReposts: e.target.checked })}
          />
        </div>
      </div>
      <div className="flex justify-between">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage {...messages.ShowLatest} />
          </h4>
          <small>
            <FormattedMessage {...messages.ShowLatestHelp} />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={pref.autoShowLatest}
            onChange={e => setPref({ ...pref, autoShowLatest: e.target.checked })}
          />
        </div>
      </div>
      <div className="flex flex-col g8">
        <h4>
          <FormattedMessage {...messages.FileUpload} />
        </h4>
        <small>
          <FormattedMessage {...messages.FileUploadHelp} />
        </small>
        <select
          value={pref.fileUploader}
          onChange={e =>
            setPref({
              ...pref,
              fileUploader: e.target.value,
            } as UserPreferences)
          }>
          <option value="nip96">
            <FormattedMessage defaultMessage="NIP-96" />
          </option>
          <option value="void.cat">
            void.cat <FormattedMessage {...messages.Default} />
          </option>
          <option value="void.cat-NIP96">void.cat (NIP-96)</option>
          <option value="nostr.build">nostr.build</option>
          <option value="nostrimg.com">nostrimg.com</option>
          <option value="nostrcheck.me">nostrcheck.me (NIP-96)</option>
        </select>
      </div>
      <div className="flex justify-between">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage {...messages.DebugMenus} />
          </h4>
          <small>
            <FormattedMessage {...messages.DebugMenusHelp} />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={pref.showDebugMenus}
            onChange={e => setPref({ ...pref, showDebugMenus: e.target.checked })}
          />
        </div>
      </div>
      <div className="flex justify-between">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage defaultMessage="Hide muted notes" />
          </h4>
          <small>
            <FormattedMessage defaultMessage="Muted notes will not be shown" />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={pref.hideMutedNotes}
            onChange={e => setPref({ ...pref, hideMutedNotes: e.target.checked })}
          />
        </div>
      </div>
      <AsyncButton onClick={() => update(pref)}>
        <FormattedMessage defaultMessage="Save" />
      </AsyncButton>
      {error && <b className="error">{error}</b>}
    </div>
  );
};
export default PreferencesPage;
