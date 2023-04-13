import { useEffect, useState } from "react";
import { FormattedDate, FormattedMessage, FormattedNumber } from "react-intl";
import { Link } from "react-router-dom";

import PageSpinner from "Element/PageSpinner";
import useEventPublisher from "Feed/EventPublisher";
import SnortApi, { Subscription } from "SnortApi";
import { mapPlanName } from ".";
import Icon from "Icons/Icon";

export default function ManageSubscriptionPage() {
  const publisher = useEventPublisher();
  const api = new SnortApi(undefined, publisher);

  const [subs, setSubs] = useState<Array<Subscription>>();
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const s = await api.listSubscriptions();
        setSubs(s);
      } catch (e) {
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError("Unknown error");
        }
      }
    })();
  }, []);

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
        const isExpired = expires < now;
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
              {daysToExpire < 0 && (
                <p className="f-1 error">
                  <FormattedMessage defaultMessage="Expired" />
                </p>
              )}
            </div>
            {isExpired && (
              <div className="flex">
                <button>
                  <FormattedMessage defaultMessage="Renew" />
                </button>
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
      {error && <b className="error">{error}</b>}
    </>
  );
}
