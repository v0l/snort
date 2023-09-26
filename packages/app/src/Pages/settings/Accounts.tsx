import FormattedMessage from "@snort/app/src/Element/FormattedMessage";
import { Link } from "react-router-dom";

import ProfilePreview from "Element/ProfilePreview";
import { LoginStore } from "Login";
import { getActiveSubscriptions } from "Subscription";

export default function AccountsPage() {
  const logins = LoginStore.getSessions();
  const sub = getActiveSubscriptions(LoginStore.allSubscriptions());

  return (
    <div className="flex-column g12">
      <h3>
        <FormattedMessage defaultMessage="Logins" />
      </h3>
      {logins.map(a => (
        <div className="card flex" key={a.id}>
          <ProfilePreview
            pubkey={a.pubkey}
            options={{
              about: false,
            }}
            actions={
              <div className="f-1">
                <button className="mb10" onClick={() => LoginStore.switchAccount(a.id)}>
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
