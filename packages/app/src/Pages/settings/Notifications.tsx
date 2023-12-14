import "./Preferences.css";

import { FormattedMessage } from "react-intl";
import useLogin from "@/Hooks/useLogin";
import { updatePreferences } from "@/Login";
import { useLocale } from "@/IntlProvider";

const PreferencesPage = () => {
  const { id, perf } = useLogin(s => ({ id: s.id, perf: s.appData.item.preferences }));
  const { lang } = useLocale();

  return (
    <div className="preferences flex flex-col g24">
      <h3>
        <FormattedMessage defaultMessage="Notifications" id="NAidKb" />
      </h3>

      <div className="flex justify-between w-max">
        <h4>
          <FormattedMessage defaultMessage="Language" id="y1Z3or" />
        </h4>
        <div>
          <select
            value={lang}
            onChange={e =>
              updatePreferences(id, {
                ...perf,
                language: e.target.value,
              })
            }
            style={{ textTransform: "capitalize" }}>
            <option value={1}>asdf</option>
          </select>
        </div>
      </div>
    </div>
  );
};
export default PreferencesPage;
