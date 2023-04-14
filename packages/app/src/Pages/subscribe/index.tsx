import "./index.css";

import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { RouteObject } from "react-router-dom";

import { formatShort } from "Number";
import { LockedFeatures, Plans, SubscriptionType } from "Subscription";
import ManageSubscriptionPage from "Pages/subscribe/ManageSubscription";
import AsyncButton from "Element/AsyncButton";
import useEventPublisher from "Feed/EventPublisher";
import SnortApi from "SnortApi";
import SendSats from "Element/SendSats";

export function mapPlanName(id: number) {
  switch (id) {
    case SubscriptionType.Supporter:
      return <FormattedMessage defaultMessage="Supporter" />;
    case SubscriptionType.Premium:
      return <FormattedMessage defaultMessage="Premium" />;
  }
}

export function mapFeatureName(k: LockedFeatures) {
  switch (k) {
    case LockedFeatures.MultiAccount:
      return <FormattedMessage defaultMessage="Multi account support" />;
    case LockedFeatures.NostrAddress:
      return <FormattedMessage defaultMessage="Snort nostr address" />;
    case LockedFeatures.Badge:
      return <FormattedMessage defaultMessage="Supporter Badge" />;
    case LockedFeatures.DeepL:
      return <FormattedMessage defaultMessage="DeepL translations" />;
    case LockedFeatures.RelayRetention:
      return <FormattedMessage defaultMessage="Unlimited note retention on Snort relay" />;
    case LockedFeatures.RelayBackup:
      return <FormattedMessage defaultMessage="Downloadable backups from Snort relay" />;
  }
}

export function SubscribePage() {
  const publisher = useEventPublisher();
  const api = new SnortApi(undefined, publisher);
  const [invoice, setInvoice] = useState("");

  async function subscribe(type: number) {
    const rsp = await api.createSubscription(type);
    setInvoice(rsp.pr);
  }

  return (
    <div className="flex subscribe-page">
      {Plans.map(a => {
        const lower = Plans.filter(b => b.id < a.id);
        return (
          <div className={`card flex f-col${a.disabled ? " disabled" : ""}`}>
            <div className="f-grow">
              <h2>{mapPlanName(a.id)}</h2>
              <p>
                <FormattedMessage
                  defaultMessage="Subscribe to Snort {plan} for {price} and receive the following rewards"
                  values={{
                    plan: mapPlanName(a.id),
                    price: <b>{formatShort(a.price)} sats/mo</b>,
                  }}
                />
                :
              </p>
              <ul>
                {a.unlocks.map(b => (
                  <li>{mapFeatureName(b)}</li>
                ))}
                {lower.map(b => (
                  <li>
                    <FormattedMessage
                      defaultMessage="Everything in {plan}"
                      values={{
                        plan: mapPlanName(b.id),
                      }}
                    />
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex f-center w-max mb10">
              <AsyncButton className="button" disabled={a.disabled} onClick={() => subscribe(a.id)}>
                {a.disabled ? (
                  <FormattedMessage defaultMessage="Coming soon" />
                ) : (
                  <FormattedMessage defaultMessage="Subscribe" />
                )}
              </AsyncButton>
            </div>
          </div>
        );
      })}
      <SendSats invoice={invoice} show={invoice !== ""} onClose={() => setInvoice("")} />
    </div>
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
