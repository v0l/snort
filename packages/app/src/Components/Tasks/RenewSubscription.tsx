import { FormattedMessage } from "react-intl";
import { MetadataCache } from "@snort/system";

import { BaseUITask } from "@/Components/Tasks/index";
import { LoginSession } from "@/Utils/Login";
import { getCurrentSubscription } from "@/Utils/Subscription";
import { RenewSub } from "@/Pages/subscribe/RenewSub";

export class RenewSubTask extends BaseUITask {
  id = "renew-sub";

  check(user: MetadataCache, session: LoginSession): boolean {
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
        <RenewSub />
      </>
    );
  }
}
