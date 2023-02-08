import "./Preferences.css";

import { useDispatch, useSelector } from "react-redux";
import { FormattedMessage } from "react-intl";

import { DefaultImgProxy, setPreferences, UserPreferences } from "State/Login";
import { RootState } from "State/Store";

import messages from "./messages";

const PreferencesPage = () => {
  const dispatch = useDispatch();
  const perf = useSelector<RootState, UserPreferences>(
    (s) => s.login.preferences
  );

  return (
    <div className="preferences">
      <h3>
        <FormattedMessage {...messages.Preferences} />
      </h3>

      <div className="card flex">
        <div className="flex f-col f-grow">
          <div>
            <FormattedMessage {...messages.Theme} />
          </div>
        </div>
        <div>
          <select
            value={perf.theme}
            onChange={(e) =>
              dispatch(
                setPreferences({
                  ...perf,
                  theme: e.target.value,
                } as UserPreferences)
              )
            }
          >
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
            <FormattedMessage {...messages.AutoloadMedia} />
          </div>
          <small>
            <FormattedMessage {...messages.AutoloadMediaHelp} />
          </small>
        </div>
        <div>
          <select
            value={perf.autoLoadMedia}
            onChange={(e) =>
              dispatch(
                setPreferences({
                  ...perf,
                  autoLoadMedia: e.target.value,
                } as UserPreferences)
              )
            }
          >
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
              onChange={(e) =>
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
                  placeholder="URL.."
                  onChange={(e) =>
                    dispatch(
                      setPreferences({
                        ...perf,
                        imgProxyConfig: {
                          ...perf.imgProxyConfig!,
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
                  placeholder="Hex key.."
                  onChange={(e) =>
                    dispatch(
                      setPreferences({
                        ...perf,
                        imgProxyConfig: {
                          ...perf.imgProxyConfig!,
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
                  placeholder="Hex salt.."
                  onChange={(e) =>
                    dispatch(
                      setPreferences({
                        ...perf,
                        imgProxyConfig: {
                          ...perf.imgProxyConfig!,
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
            onChange={(e) =>
              dispatch(
                setPreferences({ ...perf, enableReactions: e.target.checked })
              )
            }
          />
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
            onChange={(e) =>
              dispatch(
                setPreferences({ ...perf, confirmReposts: e.target.checked })
              )
            }
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
            onChange={(e) =>
              dispatch(
                setPreferences({ ...perf, autoShowLatest: e.target.checked })
              )
            }
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
        </div>
        <div>
          <select
            value={perf.fileUploader}
            onChange={(e) =>
              dispatch(
                setPreferences({
                  ...perf,
                  fileUploader: e.target.value,
                } as UserPreferences)
              )
            }
          >
            <option value="void.cat">
              void.cat <FormattedMessage {...messages.Default} />
            </option>
            <option value="nostr.build">nostr.build</option>
            <option value="nostrimg.com">nostrimg.com</option>
          </select>
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
            onChange={(e) =>
              dispatch(
                setPreferences({ ...perf, showDebugMenus: e.target.checked })
              )
            }
          />
        </div>
      </div>
    </div>
  );
};
export default PreferencesPage;
