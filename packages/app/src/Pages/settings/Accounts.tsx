import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import ProfilePreview from "@/Element/User/ProfilePreview";
import { LoginStore } from "@/Login";
import { getActiveSubscriptions } from "@/Subscription";

export default function AccountsPage() {
  const logins = LoginStore.getSessions();
  const sub = getActiveSubscriptions(LoginStore.allSubscriptions());

  return (
    <div className="flex flex-col g12">
      <h3>
        <FormattedMessage defaultMessage="Logins" id="+vA//S" />
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
                  <FormattedMessage defaultMessage="Switch" id="n1Whvj" />
                </button>
                <button onClick={() => LoginStore.removeSession(a.id)}>
                  <FormattedMessage defaultMessage="Logout" id="C81/uG" />
                </button>
              </div>
            }
          />
        </div>
      ))}

      {sub && (
        <Link to={"/login"}>
          <button type="button">
            <FormattedMessage defaultMessage="Add Account" id="F3l7xL" />
          </button>
        </Link>
      )}
    </div>
  );
}
