import "./Preferences.css";

import { useDispatch, useSelector } from "react-redux";
import { FormattedMessage, useIntl } from "react-intl";
import { Link } from "react-router-dom";
import emoji from "@jukben/emoji-search";

import { DefaultImgProxy, setPreferences, UserPreferences } from "State/Login";
import { RootState } from "State/Store";
import { unwrap } from "Util";

import messages from "./messages";

const PreferencesPage = () => {
  const dispatch = useDispatch();
  const { formatMessage } = useIntl();
  const perf = useSelector<RootState, UserPreferences>(s => s.login.preferences);

  return (
    <div className="preferences">
      <h3>
        <FormattedMessage {...messages.Preferences} />
      </h3>

      <div className="card flex">
        <div className="flex f-col f-grow">
          <div>
            <FormattedMessage defaultMessage="Language" />
          </div>
        </div>
        <div>
          <select
            value={perf.language}
            onChange={e =>
              dispatch(
                setPreferences({
                  ...perf,
                  language: e.target.value,
                } as UserPreferences)
              )
            }
            style={{ textTransform: "capitalize" }}>
            {["en", "ja", "es", "hu", "zh", "fr", "ar", "it", "id", "de"].sort().map(a => (
              <option value={a}>
                {new Intl.DisplayNames([a], {
                  type: "language",
                }).of(a)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="card flex">
        <div className="flex f-col f-grow">
          <div>
            <FormattedMessage {...messages.Theme} />
          </div>
        </div>
        <div>
          <select
            value={perf.theme}
            onChange={e =>
              dispatch(
                setPreferences({
                  ...perf,
                  theme: e.target.value,
                } as UserPreferences)
              )
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
      <div className="card flex">
        <div className="flex f-col f-grow">
          <div>
            <FormattedMessage {...messages.DefaultRootTab} />
          </div>
        </div>
        <div>
          <select
            value={perf.defaultRootTab}
            onChange={e =>
              dispatch(
                setPreferences({
                  ...perf,
                  defaultRootTab: e.target.value,
                } as UserPreferences)
              )
            }>
            <option value="posts">
              <FormattedMessage {...messages.Posts} />
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
      <div className="card flex">
        <div className="flex f-col f-grow">
          <div>
            <FormattedMessage {...messages.AutoloadMedia} />
          </div>
          <small>
            <FormattedMessage {...messages.AutoloadMediaHelp} />
          </small>
          <div className="mt10">
            <select
              value={perf.autoLoadMedia}
              onChange={e =>
                dispatch(
                  setPreferences({
                    ...perf,
                    autoLoadMedia: e.target.value,
                  } as UserPreferences)
                )
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
      <div className="card flex">
        <div className="flex f-col f-grow">
          <div>
            <FormattedMessage defaultMessage="Default Zap amount" />
          </div>
        </div>
        <div>
          <input
            type="number"
            defaultValue={perf.defaultZapAmount}
            min={1}
            onChange={e => dispatch(setPreferences({ ...perf, defaultZapAmount: parseInt(e.target.value || "0") }))}
          />
        </div>
      </div>
      <div className="card flex">
        <div className="flex f-col f-grow">
          <div>
            <FormattedMessage defaultMessage="Fast Zap Donation" />
          </div>
          <small>
            <FormattedMessage
              defaultMessage="For each Fast Zap an additional {percentage}% ({amount} sats) of the zap amount will be sent to the Snort developers as a donation."
              values={{
                percentage: perf.fastZapDonate * 100,
                amount: Math.floor(perf.defaultZapAmount * perf.fastZapDonate),
              }}
            />
            <br />
            <FormattedMessage
              defaultMessage="For more information about donations see {link}."
              values={{
                link: (
                  <Link to="/donate">
                    <FormattedMessage defaultMessage="Donate Page" />
                  </Link>
                ),
              }}
            />
          </small>
        </div>
        <div>
          <input
            type="number"
            defaultValue={perf.fastZapDonate * 100}
            min={0}
            max={100}
            onChange={e => dispatch(setPreferences({ ...perf, fastZapDonate: parseInt(e.target.value || "0") / 100 }))}
          />
        </div>
      </div>
      <div className="card flex">
        <div className="flex f-col f-grow">
          <div>
            <FormattedMessage defaultMessage="Auto Zap" />
          </div>
          <small>
            <FormattedMessage defaultMessage="Automatically zap every note when loaded" />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={perf.autoZap}
            onChange={e => dispatch(setPreferences({ ...perf, autoZap: e.target.checked }))}
          />
        </div>
      </div>
      <div className="card flex f-col">
        <div className="flex w-max">
          <div className="flex f-col f-grow">
            <div>
              <FormattedMessage {...messages.ImgProxy} />
            </div>
            <small>
              <FormattedMessage {...messages.ImgProxyHelp} />
            </small>
          </div>
          <div>
            <input
              type="checkbox"
              checked={perf.imgProxyConfig !== null}
              onChange={e =>
                dispatch(
                  setPreferences({
                    ...perf,
                    imgProxyConfig: e.target.checked ? DefaultImgProxy : null,
                  })
                )
              }
            />
          </div>
        </div>
        {perf.imgProxyConfig && (
          <div className="w-max mt10 form">
            <div className="form-group">
              <div>
                <FormattedMessage {...messages.ServiceUrl} />
              </div>
              <div className="w-max">
                <input
                  type="text"
                  value={perf.imgProxyConfig?.url}
                  placeholder={formatMessage({
                    defaultMessage: "URL..",
                    description: "Placeholder text for imgproxy url textbox",
                  })}
                  onChange={e =>
                    dispatch(
                      setPreferences({
                        ...perf,
                        imgProxyConfig: {
                          ...unwrap(perf.imgProxyConfig),
                          url: e.target.value,
                        },
                      })
                    )
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
                  value={perf.imgProxyConfig?.key}
                  placeholder={formatMessage({
                    defaultMessage: "Hex Key..",
                    description: "Hexidecimal 'key' input for improxy",
                  })}
                  onChange={e =>
                    dispatch(
                      setPreferences({
                        ...perf,
                        imgProxyConfig: {
                          ...unwrap(perf.imgProxyConfig),
                          key: e.target.value,
                        },
                      })
                    )
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
                  value={perf.imgProxyConfig?.salt}
                  placeholder={formatMessage({
                    defaultMessage: "Hex Salt..",
                    description: "Hexidecimal 'salt' input for imgproxy",
                  })}
                  onChange={e =>
                    dispatch(
                      setPreferences({
                        ...perf,
                        imgProxyConfig: {
                          ...unwrap(perf.imgProxyConfig),
                          salt: e.target.value,
                        },
                      })
                    )
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="card flex">
        <div className="flex f-col f-grow">
          <div>
            <FormattedMessage {...messages.EnableReactions} />
          </div>
          <small>
            <FormattedMessage {...messages.EnableReactionsHelp} />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={perf.enableReactions}
            onChange={e => dispatch(setPreferences({ ...perf, enableReactions: e.target.checked }))}
          />
        </div>
      </div>
      <div className="card flex">
        <div className="flex f-col f-grow">
          <div>
            <FormattedMessage {...messages.ReactionEmoji} />
          </div>
          <small>
            <FormattedMessage {...messages.ReactionEmojiHelp} />
          </small>
          <div className="mt10">
            <select
              className="emoji-selector"
              value={perf.reactionEmoji}
              onChange={e =>
                dispatch(
                  setPreferences({
                    ...perf,
                    reactionEmoji: e.target.value,
                  } as UserPreferences)
                )
              }>
              <option value="+">
                + <FormattedMessage {...messages.Default} />
              </option>
              {emoji("").map(({ name, char }) => {
                return (
                  <option value={char}>
                    {name} {char}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>
      <div className="card flex">
        <div className="flex f-col f-grow">
          <div>
            <FormattedMessage {...messages.ConfirmReposts} />
          </div>
          <small>
            <FormattedMessage {...messages.ConfirmRepostsHelp} />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={perf.confirmReposts}
            onChange={e => dispatch(setPreferences({ ...perf, confirmReposts: e.target.checked }))}
          />
        </div>
      </div>
      <div className="card flex">
        <div className="flex f-col f-grow">
          <div>
            <FormattedMessage {...messages.ShowLatest} />
          </div>
          <small>
            <FormattedMessage {...messages.ShowLatestHelp} />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={perf.autoShowLatest}
            onChange={e => dispatch(setPreferences({ ...perf, autoShowLatest: e.target.checked }))}
          />
        </div>
      </div>
      <div className="card flex">
        <div className="flex f-col f-grow">
          <div>
            <FormattedMessage {...messages.FileUpload} />
          </div>
          <small>
            <FormattedMessage {...messages.FileUploadHelp} />
          </small>
          <div className="mt10">
            <select
              value={perf.fileUploader}
              onChange={e =>
                dispatch(
                  setPreferences({
                    ...perf,
                    fileUploader: e.target.value,
                  } as UserPreferences)
                )
              }>
              <option value="void.cat">
                void.cat <FormattedMessage {...messages.Default} />
              </option>
              <option value="nostr.build">nostr.build</option>
              <option value="nostrimg.com">nostrimg.com</option>
            </select>
          </div>
        </div>
      </div>
      <div className="card flex">
        <div className="flex f-col f-grow">
          <div>
            <FormattedMessage {...messages.DebugMenus} />
          </div>
          <small>
            <FormattedMessage {...messages.DebugMenusHelp} />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={perf.showDebugMenus}
            onChange={e => dispatch(setPreferences({ ...perf, showDebugMenus: e.target.checked }))}
          />
        </div>
      </div>
    </div>
  );
};
export default PreferencesPage;
