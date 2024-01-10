import "./index.css";

import classNames from "classnames";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { RouteObject } from "react-router-dom";

import AsyncButton from "@/Components/Button/AsyncButton";
import SendSats from "@/Components/SendSats/SendSats";
import SnortApi, { SubscriptionError } from "@/External/SnortApi";
import useEventPublisher from "@/Hooks/useEventPublisher";
import ManageSubscriptionPage from "@/Pages/subscribe/ManageSubscription";
import { mapFeatureName, mapPlanName, mapSubscriptionErrorCode } from "@/Pages/subscribe/utils";
import { getRefCode } from "@/Utils";
import { formatShort } from "@/Utils/Number";
import { Plans } from "@/Utils/Subscription";

export function SubscribePage() {
  const { publisher } = useEventPublisher();
  const api = new SnortApi(undefined, publisher);
  const [invoice, setInvoice] = useState("");
  const [error, setError] = useState<SubscriptionError>();

  async function subscribe(type: number) {
    setError(undefined);
    try {
      const ref = getRefCode();
      const rsp = await api.createSubscription(type, ref);
      setInvoice(rsp.pr);
    } catch (e) {
      if (e instanceof SubscriptionError) {
        setError(e);
      }
    }
  }

  return (
    <>
      <div className="flex subscribe-page main-content">
        {Plans.map(a => {
          const lower = Plans.filter(b => b.id < a.id);
          return (
            <div key={a.id} className={classNames("p flex flex-col g8", { disabled: a.disabled })}>
              <div className="grow">
                <h2>{mapPlanName(a.id)}</h2>
                <p>
                  <FormattedMessage
                    defaultMessage="Subscribe to {site_name} {plan} for {price} and receive the following rewards"
                    id="JSx7y9"
                    values={{
                      site_name: CONFIG.appNameCapitalized,
                      plan: mapPlanName(a.id),
                      price: <b>{formatShort(a.price)} sats/mo</b>,
                    }}
                  />
                  :
                </p>
                <ul className="list-disc">
                  {a.unlocks.map(b => (
                    <li key={`unlocks-${b}`}>{mapFeatureName(b)} </li>
                  ))}
                  {lower.map(b => (
                    <li key={`lower-${b}`}>
                      <FormattedMessage
                        defaultMessage="Everything in {plan}"
                        id="l+ikU1"
                        values={{
                          plan: mapPlanName(b.id),
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-center">
                <AsyncButton className="button" disabled={a.disabled} onClick={() => subscribe(a.id)}>
                  {a.disabled ? (
                    <FormattedMessage defaultMessage="Coming soon" id="e61Jf3" />
                  ) : (
                    <FormattedMessage defaultMessage="Subscribe" id="gczcC5" />
                  )}
                </AsyncButton>
              </div>
            </div>
          );
        })}
      </div>
      {error && <b className="error">{mapSubscriptionErrorCode(error)}</b>}
      <SendSats invoice={invoice} show={invoice !== ""} onClose={() => setInvoice("")} />
    </>
  );
}

export const SubscribeRoutes = [
  {
    path: "/subscribe",
    element: <SubscribePage />,
  },
  {
    path: "/subscribe/manage",
    element: <ManageSubscriptionPage />,
  },
] as RouteObject[];
