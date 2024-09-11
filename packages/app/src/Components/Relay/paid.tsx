import { RelayInfo } from "@snort/system";
import classNames from "classnames";
import { FormattedMessage } from "react-intl";

export default function RelayPaymentLabel({ info }: { info: RelayInfo }) {
  const isPaid = info?.limitation?.payment_required ?? false;
  return (
    <div
      className={classNames("rounded-full px-2 py-1 font-medium", {
        "bg-[var(--pro)] text-black": isPaid,
        "bg-[var(--free)]": !isPaid,
      })}>
      {isPaid && <FormattedMessage defaultMessage="Paid" />}
      {!isPaid && <FormattedMessage defaultMessage="Free" />}
    </div>
  );
}
