import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link, useNavigate } from "react-router-dom";

import { ErrorOrOffline } from "@/Components/ErrorOrOffline";
import PageSpinner from "@/Components/PageSpinner";
import SnortApi, { Subscription, SubscriptionError } from "@/External/SnortApi";
import useEventPublisher from "@/Hooks/useEventPublisher";
import { mapSubscriptionErrorCode } from "@/Pages/subscribe/utils";

import SubscriptionCard from "./SubscriptionCard";

export default function ManageSubscriptionPage() {
  const { publisher } = useEventPublisher();
  const api = new SnortApi(undefined, publisher);
  const navigate = useNavigate();

  const [subs, setSubs] = useState<Array<Subscription>>();
  const [error, setError] = useState<Error>();

  async function loadSubs() {
    setError(undefined);
    try {
      const s = await api.listSubscriptions();
      setSubs(s);
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      }
    }
  }
  useEffect(() => {
    loadSubs();
  }, []);

  if (!(error instanceof SubscriptionError) && error instanceof Error)
    return <ErrorOrOffline error={error} onRetry={loadSubs} className="px-3 py-2" />;
  if (subs === undefined) {
    return <PageSpinner />;
  }
  return (
    <div className="px-3 py-2 flex flex-col gap-4">
      <h2>
        <FormattedMessage defaultMessage="Subscriptions" />
      </h2>
      {subs.map(a => (
        <SubscriptionCard sub={a} key={a.id} />
      ))}
      {subs.length !== 0 && (
        <button className="primary" onClick={() => navigate("/subscribe")}>
          <FormattedMessage defaultMessage="Buy Subscription" />
        </button>
      )}
      {subs.length === 0 && (
        <p>
          <FormattedMessage
            defaultMessage="It looks like you dont have any subscriptions, you can get one {link}"
            id="W1yoZY"
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
      {error instanceof SubscriptionError && <b className="error">{mapSubscriptionErrorCode(error)}</b>}
    </div>
  );
}
