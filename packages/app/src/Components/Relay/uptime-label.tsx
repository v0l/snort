import classNames from "classnames";
import { FormattedMessage } from "react-intl";

export default function UptimeLabel({ avgPing }: { avgPing: number }) {
  const idealPing = 500;
  const badPing = idealPing * 2;
  return (
    <div
      className={classNames("font-semibold", {
        "text-error": isNaN(avgPing) || avgPing > badPing,
        "text-warning": avgPing > idealPing && avgPing < badPing,
        "text-success": avgPing < idealPing,
      })}
      title={`${avgPing.toFixed(0)} ms`}>
      {isNaN(avgPing) && <FormattedMessage defaultMessage="Dead" />}
      {avgPing > badPing && <FormattedMessage defaultMessage="Poor" />}
      {avgPing > idealPing && avgPing < badPing && <FormattedMessage defaultMessage="Good" />}
      {avgPing < idealPing && <FormattedMessage defaultMessage="Great" />}
    </div>
  );
}
