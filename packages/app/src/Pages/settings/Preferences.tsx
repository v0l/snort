import { ReactNode, useState } from "react";
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
  const { preferences: pref, update: setPref, save } = useAllPreferences();
  const [error, setError] = useState("");
  const { lang } = useLocale();

  function row(title: ReactNode, description: ReactNode | undefined, control: ReactNode) {
    return (
      <div className="flex justify-between">
        <div className="flex flex-col gap-2">
          <h4>{title}</h4>
          {description && <small>{description}</small>}
        </div>
        <div>{control}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h3>
        <FormattedMessage defaultMessage="Preferences" />
      </h3>
      <AsyncButton onClick={() => save()}>
        <FormattedMessage defaultMessage="Save" />
      </AsyncButton>
      {error && <b className="warning">{error}</b>}

      {/** START CONTROLS */}

      {row(
        <FormattedMessage defaultMessage="Language" />,
        undefined,
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
        </select>,
      )}

      {row(
        <FormattedMessage {...messages.Theme} />,
        undefined,
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
        </select>,
      )}
      {row(
        <FormattedMessage {...messages.DefaultRootTab} />,
        undefined,
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
        </select>,
      )}

      {row(
        <FormattedMessage defaultMessage="Send usage metrics" />,
        <FormattedMessage defaultMessage="Send anonymous usage metrics" />,
        <input
          type="checkbox"
          checked={pref.telemetry ?? true}
          onChange={e => setPref({ ...pref, telemetry: e.target.checked })}
        />,
      )}
      {row(
        <FormattedMessage {...messages.AutoloadMedia} />,
        <FormattedMessage {...messages.AutoloadMediaHelp} />,
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
        </select>,
      )}

      {row(
        <FormattedMessage defaultMessage="Check Signatures" />,
        <FormattedMessage defaultMessage="Check all event signatures received from relays" />,
        <input
          type="checkbox"
          checked={pref.checkSigs}
          onChange={e => setPref({ ...pref, checkSigs: e.target.checked })}
        />,
      )}

      {row(
        <FormattedMessage defaultMessage="WoT Filter" />,
        <FormattedMessage defaultMessage="Mute notes from people who are outside your web of trust" />,
        <input
          type="checkbox"
          checked={pref.muteWithWoT}
          onChange={e => setPref({ ...pref, muteWithWoT: e.target.checked })}
        />,
      )}

      {row(
        <FormattedMessage defaultMessage="Hide muted notes" />,
        <FormattedMessage defaultMessage="Muted notes will not be shown" />,
        <input
          type="checkbox"
          checked={pref.hideMutedNotes}
          onChange={e => setPref({ ...pref, hideMutedNotes: e.target.checked })}
        />,
      )}

      {row(
        <FormattedMessage defaultMessage="Auto Translate" />,
        <FormattedMessage defaultMessage="Automatically translate notes to your local language" />,
        <input
          type="checkbox"
          checked={pref.autoTranslate}
          onChange={e => setPref({ ...pref, autoTranslate: e.target.checked })}
        />,
      )}

      {row(
        <FormattedMessage defaultMessage="Proof of Work" />,
        <FormattedMessage defaultMessage="Amount of work to apply to all published events" />,
        <input
          type="number"
          defaultValue={pref.pow}
          min={0}
          className="w-20"
          onChange={e => setPref({ ...pref, pow: parseInt(e.target.value || "0") })}
        />,
      )}

      {row(
        <FormattedMessage defaultMessage="Default Zap amount" />,
        undefined,
        <input
          type="number"
          defaultValue={pref.defaultZapAmount}
          min={1}
          className="w-20"
          onChange={e => setPref({ ...pref, defaultZapAmount: parseInt(e.target.value || "0") })}
        />,
      )}

      {row(
        <FormattedMessage defaultMessage="Show Badges" />,
        <FormattedMessage defaultMessage="Show badges on profile pages" />,
        <input
          type="checkbox"
          checked={pref.showBadges ?? false}
          onChange={e => setPref({ ...pref, showBadges: e.target.checked })}
        />,
      )}

      {row(
        <FormattedMessage defaultMessage="Show Status" />,
        <FormattedMessage defaultMessage="Show status messages on profile pages" />,
        <input
          type="checkbox"
          checked={pref.showStatus ?? true}
          onChange={e => setPref({ ...pref, showStatus: e.target.checked })}
        />,
      )}

      {row(
        <FormattedMessage defaultMessage="Auto Zap" />,
        <FormattedMessage defaultMessage="Automatically zap every note when loaded" />,
        <input
          type="checkbox"
          checked={pref.autoZap}
          onChange={e => setPref({ ...pref, autoZap: e.target.checked })}
        />,
      )}
      {row(
        <FormattedMessage {...messages.ImgProxy} />,
        <FormattedMessage {...messages.ImgProxyHelp} />,
        <input
          type="checkbox"
          checked={pref.imgProxyConfig !== undefined}
          onChange={e =>
            setPref({
              ...pref,
              imgProxyConfig: e.target.checked ? DefaultImgProxy : undefined,
            })
          }
        />,
      )}

      {pref.imgProxyConfig && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <FormattedMessage defaultMessage="Server" />
            </div>
            <input
              type="text"
              value={pref.imgProxyConfig?.url}
              placeholder={formatMessage({
                defaultMessage: "URL..",
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
          <div className="flex items-center justify-between">
            <div>
              <FormattedMessage {...messages.ServiceKey} />
            </div>
            <input
              type="password"
              value={pref.imgProxyConfig?.key}
              placeholder={formatMessage({
                defaultMessage: "Hex Key..",
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
          <div className="flex items-center justify-between">
            <div>
              <FormattedMessage {...messages.ServiceSalt} />
            </div>
            <div className="w-max">
              <input
                type="password"
                value={pref.imgProxyConfig?.salt}
                placeholder={formatMessage({
                  defaultMessage: "Hex Salt..",
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

      {row(
        <FormattedMessage {...messages.EnableReactions} />,
        <FormattedMessage {...messages.EnableReactionsHelp} />,
        <input
          type="checkbox"
          checked={pref.enableReactions}
          onChange={e => setPref({ ...pref, enableReactions: e.target.checked })}
        />,
      )}

      {row(
        <FormattedMessage {...messages.ReactionEmoji} />,
        <FormattedMessage {...messages.ReactionEmojiHelp} />,
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
        />,
      )}

      {row(
        <FormattedMessage {...messages.ConfirmReposts} />,
        <FormattedMessage {...messages.ConfirmRepostsHelp} />,
        <input
          type="checkbox"
          checked={pref.confirmReposts}
          onChange={e => setPref({ ...pref, confirmReposts: e.target.checked })}
        />,
      )}

      {row(
        <FormattedMessage {...messages.ShowLatest} />,
        <FormattedMessage {...messages.ShowLatestHelp} />,
        <input
          type="checkbox"
          checked={pref.autoShowLatest}
          onChange={e => setPref({ ...pref, autoShowLatest: e.target.checked })}
        />,
      )}

      {row(
        <FormattedMessage {...messages.DebugMenus} />,
        <FormattedMessage {...messages.DebugMenusHelp} />,
        <input
          type="checkbox"
          checked={pref.showDebugMenus}
          onChange={e => setPref({ ...pref, showDebugMenus: e.target.checked })}
        />,
      )}

      <AsyncButton onClick={() => save()}>
        <FormattedMessage defaultMessage="Save" />
      </AsyncButton>
      {error && <b className="error">{error}</b>}
    </div>
  );
};
export default PreferencesPage;
