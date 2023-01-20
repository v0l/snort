import { useDispatch, useSelector } from "react-redux";
import { setPreferences, UserPreferences } from "State/Login";
import { RootState } from "State/Store";
import "./Preferences.css";

const PreferencesPage = () => {
    const dispatch = useDispatch();
    const perf = useSelector<RootState, UserPreferences>(s => s.login.preferences);

    return (
        <div className="preferences">
            <h3>Preferences</h3>

            <div className="card flex">
                <div className="flex f-col f-grow">
                    <div>Theme</div>
                </div>
                <div>
                    <select value={perf.theme} onChange={e => dispatch(setPreferences({ ...perf, theme: "light" === e.target.value ? "light" : "dark" }))}>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                    </select>
                </div>
            </div>
            <div className="card flex">
                <div className="flex f-col f-grow">
                    <div>Automatically load media</div>
                    <small>Media in posts will automatically be shown, if disabled only the link will show</small>
                </div>
                <div>
                    <input type="checkbox" checked={perf.autoLoadMedia} onChange={e => dispatch(setPreferences({ ...perf, autoLoadMedia: e.target.checked }))} />
                </div>
            </div>
            <div className="card flex">
                <div className="flex f-col f-grow">
                    <div>Enable reactions</div>
                    <small>Reactions will be shown on every page, if disabled no reactions will be shown</small>
                </div>
                <div>
                    <input type="checkbox" checked={perf.enableReactions} onChange={e => dispatch(setPreferences({ ...perf, enableReactions: e.target.checked }))} />
                </div>
            </div>
            <div className="card flex">
                <div className="flex f-col f-grow">
                    <div>Confirm reposts</div>
                    <small>Reposts need to be manually confirmed</small>
                </div>
                <div>
                    <input type="checkbox" checked={perf.confirmReposts} onChange={e => dispatch(setPreferences({ ...perf, confirmReposts: e.target.checked }))} />
                </div>
            </div>
        </div>
    )
}
export default PreferencesPage;