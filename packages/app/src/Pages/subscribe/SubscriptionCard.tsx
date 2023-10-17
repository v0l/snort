import { FormattedMessage, FormattedDate, FormattedNumber, useIntl } from "react-intl";
import { useState } from "react";

import SnortApi, { Subscription, SubscriptionError } from "SnortApi";
import { mapPlanName, mapSubscriptionErrorCode } from ".";
import AsyncButton from "Element/AsyncButton";
import Icon from "Icons/Icon";
import useEventPublisher from "Hooks/useEventPublisher";
import SendSats from "Element/SendSats";
import Nip5Service from "Element/Nip5Service";
import { SnortNostrAddressService } from "Pages/NostrAddressPage";
import Nip05 from "Element/User/Nip05";

export default function SubscriptionCard({ sub }: { sub: Subscription }) {
  const { publisher } = useEventPublisher();
  const { formatMessage } = useIntl();

  const created = new Date(sub.created * 1000);
  const expires = new Date(sub.expires * 1000);
  const now = new Date();
  const daysToExpire = Math.floor((expires.getTime() - now.getTime()) / 8.64e7);
  const hoursToExpire = Math.floor((expires.getTime() - now.getTime()) / 3.6e6);
  const isExpired = sub.state === "expired";
  const isNew = sub.state === "new";
  const isPaid = sub.state === "paid";

  const [invoice, setInvoice] = useState("");
  const [error, setError] = useState<SubscriptionError>();
  const [months, setMonths] = useState(1);

  async function renew(id: string, months: number) {
    const api = new SnortApi(undefined, publisher);
    try {
      const rsp = await api.renewSubscription(id, months);
      setInvoice(rsp.pr);
    } catch (e) {
      if (e instanceof SubscriptionError) {
        setError(e);
      }
    }
  }

  function subFeatures() {
    return (
      <>
        {!sub.handle && (
          <>
            <h3>
              <FormattedMessage defaultMessage="Claim your included Snort nostr address" />
            </h3>
            <Nip5Service
              {...SnortNostrAddressService}
              helpText={false}
              forSubscription={sub.id}
              onSuccess={h => (sub.handle = h)}
            />
          </>
        )}
        {sub.handle && <Nip05 nip05={sub.handle} pubkey={""} verifyNip={false} />}
      </>
    );
  }

  return (
    <>
      <div className="p subtier">
        <div className="flex card-title">
          <Icon name="badge" className="mr5" size={25} />
          {mapPlanName(sub.type)}
        </div>
        <div className="flex">
          <p className="f-1">
            <FormattedMessage defaultMessage="Created" />
            :&nbsp;
            <time dateTime={created.toISOString()}>
              <FormattedDate value={created} dateStyle="full" />
            </time>
          </p>
          {daysToExpire >= 1 && (
            <p className="f-1">
              <FormattedMessage defaultMessage="Expires" />
              :&nbsp;
              <time dateTime={expires.toISOString()}>
                <FormattedMessage
                  defaultMessage="{n} days"
                  values={{
                    n: <FormattedNumber value={daysToExpire} maximumFractionDigits={0} />,
                  }}
                />
              </time>
            </p>
          )}
          {daysToExpire >= 0 && daysToExpire < 1 && (
            <p className="f-1">
              <FormattedMessage defaultMessage="Expires" />
              :&nbsp;
              <time dateTime={expires.toISOString()}>
                <FormattedMessage
                  defaultMessage="{n} hours"
                  values={{
                    n: <FormattedNumber value={hoursToExpire} maximumFractionDigits={0} />,
                  }}
                />
              </time>
            </p>
          )}
          {isExpired && (
            <p className="f-1 error">
              <FormattedMessage defaultMessage="Expired" />
            </p>
          )}
          {isNew && (
            <p className="f-1">
              <FormattedMessage defaultMessage="Unpaid" />
            </p>
          )}
        </div>
        {(isExpired || isNew) && (
          <div className="flex g8">
            <div className="flex flex-col g4">
              <span>&nbsp;</span>
              <AsyncButton onClick={() => renew(sub.id, months)}>
                {isExpired ? (
                  <FormattedMessage defaultMessage="Renew" />
                ) : (
                  <FormattedMessage defaultMessage="Pay Now" />
                )}
              </AsyncButton>
            </div>
            <div className="flex flex-col g4">
              <small>
                <FormattedMessage defaultMessage="Months" />
              </small>
              <input type="number" value={months} onChange={e => setMonths(Number(e.target.value))} min={1} />
            </div>
          </div>
        )}
        {isPaid && subFeatures()}
      </div>
      <SendSats
        invoice={invoice}
        show={invoice !== ""}
        onClose={() => setInvoice("")}
        title={formatMessage({
          defaultMessage: "Pay for subscription",
        })}
      />
      {error && <b className="error">{mapSubscriptionErrorCode(error)}</b>}
    </>
  );
}
