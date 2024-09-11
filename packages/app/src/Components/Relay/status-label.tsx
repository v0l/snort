import { ConnectionType } from "@snort/system/dist/connection-pool";
import classNames from "classnames";
import { FormattedMessage } from "react-intl";

export default function RelayStatusLabel({ conn }: { conn: ConnectionType }) {
  return (
    <div className="flex gap-1 items-center">
      <div
        className={classNames("rounded-full w-4 h-4", {
          "bg-success": conn.isOpen,
          "bg-error": !conn.isOpen,
        })}></div>
      {conn.isOpen ? <FormattedMessage defaultMessage="Connected" /> : <FormattedMessage defaultMessage="Offline" />}
    </div>
  );
}
