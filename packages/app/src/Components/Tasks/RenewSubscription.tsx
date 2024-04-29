import { CachedMetadata } from "@snort/system";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import { BaseUITask } from "@/Components/Tasks/index";
import { LoginSession } from "@/Utils/Login";
import { getCurrentSubscription } from "@/Utils/Subscription";

export class RenewSubTask extends BaseUITask {
  id = "renew-sub";

  check(user: CachedMetadata, session: LoginSession): boolean {
    const sub = getCurrentSubscription(session.subscriptions);
    return !sub && session.subscriptions.length > 0;
  }

  render(): JSX.Element {
    return (
      <>
        <p>
          <FormattedMessage
            defaultMessage="Your {site_name} subscription is expired"
            id="jAmfGl"
            values={{
              site_name: CONFIG.appName,
            }}
          />
        </p>
        <Link to="/subscribe/manage">
          <FormattedMessage defaultMessage="Renew" />
        </Link>
      </>
    );
  }
}
