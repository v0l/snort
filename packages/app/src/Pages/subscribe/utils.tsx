import { FormattedMessage } from "react-intl";

import { SubscriptionError, SubscriptionErrorCode } from "@/External/SnortApi";
import { LockedFeatures, SubscriptionType } from "@/Utils/Subscription";

export function mapPlanName(id: number) {
  switch (id) {
    case SubscriptionType.Supporter:
      return <FormattedMessage defaultMessage="FAN" id="xybOUv" />;
    case SubscriptionType.Premium:
      return <FormattedMessage defaultMessage="PRO" id="hRTfTR" />;
  }
}

export function mapFeatureName(k: LockedFeatures) {
  switch (k) {
    case LockedFeatures.MultiAccount:
      return <FormattedMessage defaultMessage="Multi account support" id="cuP16y" />;
    case LockedFeatures.NostrAddress:
      return <FormattedMessage defaultMessage="Snort nostr address" id="lPWASz" />;
    case LockedFeatures.Badge:
      return <FormattedMessage defaultMessage="Supporter Badge" id="ttxS0b" />;
    case LockedFeatures.DeepL:
      return <FormattedMessage defaultMessage="DeepL translations" id="iEoXYx" />;
    case LockedFeatures.RelayRetention:
      return <FormattedMessage defaultMessage="Unlimited note retention on Snort relay" id="Ai8VHU" />;
    case LockedFeatures.RelayBackup:
      return <FormattedMessage defaultMessage="Downloadable backups from Snort relay" id="pI+77w" />;
    case LockedFeatures.RelayAccess:
      return (
        <FormattedMessage defaultMessage="Write access to Snort relay, with 1 year of event retention" id="BGCM48" />
      );
    case LockedFeatures.LNProxy:
      return <FormattedMessage defaultMessage="LN Address Proxy" id="SYQtZ7" />;
    case LockedFeatures.EmailBridge:
      return <FormattedMessage defaultMessage="Email <> DM bridge for your Snort nostr address" id="qD9EUF" />;
  }
}

export function mapSubscriptionErrorCode(c: SubscriptionError) {
  switch (c.code) {
    case SubscriptionErrorCode.InternalError:
      return <FormattedMessage defaultMessage="Internal error: {msg}" id="jMzO1S" values={{ msg: c.message }} />;
    case SubscriptionErrorCode.SubscriptionActive:
      return <FormattedMessage defaultMessage="You subscription is still active, you can't renew yet" id="OQXnew" />;
    case SubscriptionErrorCode.Duplicate:
      return (
        <FormattedMessage
          defaultMessage="You already have a subscription of this type, please renew or pay"
          id="NAuFNH"
        />
      );
    default:
      return c.message;
  }
}
