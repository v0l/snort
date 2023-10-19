import "./index.css";

import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { RouteObject } from "react-router-dom";

import { formatShort } from "Number";
import { LockedFeatures, Plans, SubscriptionType } from "Subscription";
import ManageSubscriptionPage from "Pages/subscribe/ManageSubscription";
import AsyncButton from "Element/AsyncButton";
import useEventPublisher from "Hooks/useEventPublisher";
import SnortApi, { SubscriptionError, SubscriptionErrorCode } from "External/SnortApi";
import SendSats from "Element/SendSats";
import classNames from "classnames";

export function mapPlanName(id: number) {
  switch (id) {
    case SubscriptionType.Supporter:
      return <FormattedMessage defaultMessage="Supporter" />;
    case SubscriptionType.Premium:
      return <FormattedMessage defaultMessage="PRO" />;
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
    case LockedFeatures.RelayAccess:
      return <FormattedMessage defaultMessage="Write access to Snort relay, with 1 year of event retention" />;
    case LockedFeatures.LNProxy:
      return <FormattedMessage defaultMessage="LN Address Proxy" />;
    case LockedFeatures.EmailBridge:
      return <FormattedMessage defaultMessage="Email <> DM bridge for your Snort nostr address" />;
  }
}

export function mapSubscriptionErrorCode(c: SubscriptionError) {
  switch (c.code) {
    case SubscriptionErrorCode.InternalError:
      return <FormattedMessage defaultMessage="Internal error: {msg}" values={{ msg: c.message }} />;
    case SubscriptionErrorCode.SubscriptionActive:
      return <FormattedMessage defaultMessage="You subscription is still active, you can't renew yet" />;
    case SubscriptionErrorCode.Duplicate:
      return <FormattedMessage defaultMessage="You already have a subscription of this type, please renew or pay" />;
    default:
      return c.message;
  }
}

export function SubscribePage() {
  const { publisher } = useEventPublisher();
  const api = new SnortApi(undefined, publisher);
  const [invoice, setInvoice] = useState("");
  const [error, setError] = useState<SubscriptionError>();

  async function subscribe(type: number) {
    setError(undefined);
    try {
      const rsp = await api.createSubscription(type);
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
            <div className={classNames("p flex flex-col g8", { disabled: a.disabled })}>
              <div className="grow">
                <h2>{mapPlanName(a.id)}</h2>
                <p>
                  <FormattedMessage
                    defaultMessage="Subscribe to {site_name} {plan} for {price} and receive the following rewards"
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
                    <li>{mapFeatureName(b)} </li>
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
              <div className="flex justify-center">
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
