import { FormattedMessage, FormattedDate, FormattedNumber } from "react-intl";

import { Subscription } from "@/External/SnortApi";
import { mapPlanName } from ".";
import Icon from "@/Icons/Icon";
import Nip5Service from "@/Element/Nip5Service";
import { SnortNostrAddressService } from "@/Pages/NostrAddressPage";
import Nip05 from "@/Element/User/Nip05";
import { RenewSub } from "./RenewSub";

export default function SubscriptionCard({ sub }: { sub: Subscription }) {
  const created = new Date(sub.created * 1000);
  const expires = new Date(sub.expires * 1000);
  const now = new Date();
  const daysToExpire = Math.floor((expires.getTime() - now.getTime()) / 8.64e7);
  const hoursToExpire = Math.floor((expires.getTime() - now.getTime()) / 3.6e6);
  const isExpired = sub.state === "expired";
  const isNew = sub.state === "new";
  const isPaid = sub.state === "paid";

  function subFeatures() {
    return (
      <>
        {!sub.handle && (
          <>
            <h3>
              <FormattedMessage defaultMessage="Claim your included Snort nostr address" id="GUlSVG" />
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
            <FormattedMessage defaultMessage="Created" id="ORGv1Q" />
            :&nbsp;
            <time dateTime={created.toISOString()}>
              <FormattedDate value={created} dateStyle="full" />
            </time>
          </p>
          {daysToExpire >= 1 && (
            <p className="f-1">
              <FormattedMessage defaultMessage="Expires" id="xhQMeQ" />
              :&nbsp;
              <time dateTime={expires.toISOString()}>
                <FormattedMessage
                  defaultMessage="{n} days"
                  id="rmdsT4"
                  values={{
                    n: <FormattedNumber value={daysToExpire} maximumFractionDigits={0} />,
                  }}
                />
              </time>
            </p>
          )}
          {daysToExpire >= 0 && daysToExpire < 1 && (
            <p className="f-1">
              <FormattedMessage defaultMessage="Expires" id="xhQMeQ" />
              :&nbsp;
              <time dateTime={expires.toISOString()}>
                <FormattedMessage
                  defaultMessage="{n} hours"
                  id="2ukA4d"
                  values={{
                    n: <FormattedNumber value={hoursToExpire} maximumFractionDigits={0} />,
                  }}
                />
              </time>
            </p>
          )}
          {isExpired && (
            <p className="f-1 error">
              <FormattedMessage defaultMessage="Expired" id="RahCRH" />
            </p>
          )}
          {isNew && (
            <p className="f-1">
              <FormattedMessage defaultMessage="Unpaid" id="6uMqL1" />
            </p>
          )}
        </div>
        {(isExpired || isNew) && <RenewSub sub={sub} />}
        {isPaid && subFeatures()}
      </div>
    </>
  );
}
