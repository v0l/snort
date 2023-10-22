import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { unixNow, unwrap } from "@snort/shared";

import AsyncButton from "Element/AsyncButton";
import SendSats from "Element/SendSats";
import useEventPublisher from "Hooks/useEventPublisher";
import SnortApi, { Subscription, SubscriptionError } from "External/SnortApi";
import { mapPlanName, mapSubscriptionErrorCode } from ".";
import useLogin from "Hooks/useLogin";
import { mostRecentSubscription } from "Subscription";

export function RenewSub({ sub: s }: { sub?: Subscription }) {
  const { subscriptions } = useLogin(s => ({ subscriptions: s.subscriptions }));
  const { publisher } = useEventPublisher();
  const { formatMessage } = useIntl();

  const [invoice, setInvoice] = useState("");
  const [error, setError] = useState<SubscriptionError>();
  const [months, setMonths] = useState(1);

  const recentSub = mostRecentSubscription(subscriptions);
  const sub =
    s ?? (recentSub
      ? ({
          id: unwrap(recentSub).id,
          type: unwrap(recentSub).type,
          created: unwrap(recentSub).start,
          expires: unwrap(recentSub).end,
          state: unwrap(recentSub).end > unixNow() ? "expired" : "paid",
        } as Subscription)
      : undefined);

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

  if (!sub) return;
  return (
    <>
      <div className="flex g8">
        <div className="flex flex-col g4">
          <small>
            <FormattedMessage defaultMessage="Months" />
          </small>
          <input type="number" value={months} onChange={e => setMonths(Number(e.target.value))} min={1} />
        </div>

        <div className="flex flex-col g4">
          <span>&nbsp;</span>
          <AsyncButton onClick={() => renew(sub.id, months)}>
            {sub.state === "expired" ? (
              <FormattedMessage
                defaultMessage="Renew {tier}"
                values={{
                  tier: mapPlanName(sub.type),
                }}
              />
            ) : (
              <FormattedMessage defaultMessage="Pay Now" />
            )}
          </AsyncButton>
        </div>
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
