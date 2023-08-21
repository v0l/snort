import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link, useNavigate } from "react-router-dom";

import PageSpinner from "Element/PageSpinner";
import useEventPublisher from "Feed/EventPublisher";
import SnortApi, { Subscription, SubscriptionError } from "SnortApi";
import { mapSubscriptionErrorCode } from ".";
import SubscriptionCard from "./SubscriptionCard";

export default function ManageSubscriptionPage() {
  const publisher = useEventPublisher();
  const api = new SnortApi(undefined, publisher);
  const navigate = useNavigate();

  const [subs, setSubs] = useState<Array<Subscription>>();
  const [error, setError] = useState<SubscriptionError>();

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

  if (subs === undefined) {
    return <PageSpinner />;
  }
  return (
    <div className="main-content p flex-column g24">
      <h2>
        <FormattedMessage defaultMessage="Subscriptions" />
      </h2>
      {subs.map(a => (
        <SubscriptionCard sub={a} key={a.id} />
      ))}
      {subs.length !== 0 && (
        <button onClick={() => navigate("/subscribe")}>
          <FormattedMessage defaultMessage="Buy Subscription" />
        </button>
      )}
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
    </div>
  );
}
