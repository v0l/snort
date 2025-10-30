import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import ProfilePreview from "@/Components/User/ProfilePreview";
import { LoginStore } from "@/Utils/Login";
import { getActiveSubscriptions } from "@/Utils/Subscription";

export default function AccountsPage() {
  const logins = LoginStore.getSessions();
  const sub = getActiveSubscriptions(LoginStore.allSubscriptions());

  return (
    <div className="flex flex-col gap-2">
      <h3>
        <FormattedMessage defaultMessage="Logins" />
      </h3>
      {logins.map(a => (
        <div key={a.id}>
          <ProfilePreview
            pubkey={a.pubkey}
            options={{
              about: false,
            }}
            actions={
              <div className="align-end flex gap-2">
                <button onClick={() => LoginStore.switchAccount(a.id)}>
                  <FormattedMessage defaultMessage="Switch" />
                </button>
                <button onClick={() => LoginStore.removeSession(a.id)}>
                  <FormattedMessage defaultMessage="Logout" />
                </button>
              </div>
            }
          />
        </div>
      ))}

      {sub && (
        <Link to={"/login"}>
          <button type="button">
            <FormattedMessage defaultMessage="Add Account" />
          </button>
        </Link>
      )}
    </div>
  );
}
