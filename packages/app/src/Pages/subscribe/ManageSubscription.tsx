import { useEffect, useState } from "react";
import { FormattedDate, FormattedMessage, FormattedNumber, useIntl } from "react-intl";
import { Link } from "react-router-dom";

import PageSpinner from "Element/PageSpinner";
import useEventPublisher from "Feed/EventPublisher";
import SnortApi, { Subscription, SubscriptionError } from "SnortApi";
import { mapPlanName, mapSubscriptionErrorCode } from ".";
import Icon from "Icons/Icon";
import AsyncButton from "Element/AsyncButton";
import SendSats from "Element/SendSats";

export default function ManageSubscriptionPage() {
  const publisher = useEventPublisher();
  const { formatMessage } = useIntl();
  const api = new SnortApi(undefined, publisher);

  const [subs, setSubs] = useState<Array<Subscription>>();
  const [error, setError] = useState<SubscriptionError>();
  const [invoice, setInvoice] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const s = await api.listSubscriptions();
        setSubs(s);
      } catch (e) {
        if (e instanceof SubscriptionError) {
          setError(e);
        }
      }
    })();
  }, []);

  async function renew(id: string) {
    try {
      const rsp = await api.renewSubscription(id);
      setInvoice(rsp.pr);
    } catch (e) {
      if (e instanceof SubscriptionError) {
        setError(e);
      }
    }
  }

  if (subs === undefined) {
    return <PageSpinner />;
  }
  return (
    <>
      <h2>
        <FormattedMessage defaultMessage="Subscriptions" />
      </h2>
      {subs.map(a => {
        const created = new Date(a.created);
        const expires = new Date(a.expires);
        const now = new Date();
        const daysToExpire = Math.floor((expires.getTime() - now.getTime()) / 8.64e7);
        const hoursToExpire = Math.floor((expires.getTime() - now.getTime()) / 3.6e6);
        const isExpired = a.state === "expired";
        const isNew = a.state === "new";
        return (
          <div key={a.id} className="card">
            <div className="flex card-title">
              <Icon name="badge" className="mr5" size={25} />
              {mapPlanName(a.type)}
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
              <div className="flex">
                <AsyncButton onClick={() => renew(a.id)}>
                  {isExpired ? (
                    <FormattedMessage defaultMessage="Renew" />
                  ) : (
                    <FormattedMessage defaultMessage="Pay Now" />
                  )}
                </AsyncButton>
              </div>
            )}
          </div>
        );
      })}
      {subs.length === 0 && (
        <p>
          <FormattedMessage
            defaultMessage="It looks like you dont have any subscriptions, you can get one {link}"
            values={{
              link: (
                <Link to="/subscribe">
                  <FormattedMessage defaultMessage="here" />
                </Link>
              ),
            }}
          />
        </p>
      )}
      {error && <b className="error">{mapSubscriptionErrorCode(error)}</b>}
      <SendSats
        invoice={invoice}
        show={invoice !== ""}
        onClose={() => setInvoice("")}
        title={formatMessage({
          defaultMessage: "Pay for subscription",
        })}
      />
    </>
  );
}
