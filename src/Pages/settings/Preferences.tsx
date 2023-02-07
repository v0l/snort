import { useDispatch, useSelector } from "react-redux";
import { DefaultImgProxy, setPreferences, UserPreferences } from "State/Login";
import { RootState } from "State/Store";
import "./Preferences.css";

const PreferencesPage = () => {
  const dispatch = useDispatch();
  const perf = useSelector<RootState, UserPreferences>(
    (s) => s.login.preferences
  );

  return (
    <div className="preferences">
      <h3>Preferences</h3>

      <div className="card flex">
        <div className="flex f-col f-grow">
          <div>Theme</div>
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
            <option value="system">System (Default)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>
      <div className="card flex">
        <div className="flex f-col f-grow">
          <div>Automatically load media</div>
          <small>
            Media in posts will automatically be shown for selected people,
            otherwise only the link will show
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
            <option value="none">None</option>
            <option value="follows-only">Follows only</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>
      <div className="card flex f-col">
        <div className="flex w-max">
          <div className="flex f-col f-grow">
            <div>Image proxy service</div>
            <small>Use imgproxy to compress images</small>
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
              <div>Service Url</div>
              <div className="w-max">
                <input
                  type="text"
                  value={perf.imgProxyConfig?.url}
                  placeholder="Url.."
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
              <div>Service Key</div>
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
              <div>Service Salt</div>
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
          <div>Enable reactions</div>
          <small>
            Reactions will be shown on every page, if disabled no reactions will
            be shown
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
          <div>Confirm reposts</div>
          <small>Reposts need to be manually confirmed</small>
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
          <div>Automatically show latest notes</div>
          <small>
            Notes will stream in real time into global and posts tab
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
          <div>File upload service</div>
          <small>
            Pick which upload service you want to upload attachments to
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
            <option value="void.cat">void.cat (Default)</option>
            <option value="nostr.build">nostr.build</option>
            <option value="nostrimg.com">nostrimg.com</option>
          </select>
        </div>
      </div>
      <div className="card flex">
        <div className="flex f-col f-grow">
          <div>Debug Menus</div>
          <small>
            Shows "Copy ID" and "Copy Event JSON" in the context menu on each
            message
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
