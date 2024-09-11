import { ConnectionType } from "@snort/system/dist/connection-pool";
import { FormattedMessage } from "react-intl";

import useLogin from "@/Hooks/useLogin";

export default function RelayPermissions({ conn }: { conn: ConnectionType }) {
  const { state } = useLogin(s => ({ v: s.state.version, state: s.state }));

  return (
    <div className="flex gap-2 cursor-pointer select-none">
      <div
        className={conn.settings.read ? "" : "text-gray"}
        onClick={async () =>
          await state.updateRelay(conn.address, {
            read: !conn.settings.read,
            write: conn.settings.write,
          })
        }>
        <FormattedMessage defaultMessage="Read" />
      </div>
      <div
        className={conn.settings.write ? "" : "text-gray"}
        onClick={async () =>
          await state.updateRelay(conn.address, {
            read: conn.settings.read,
            write: !conn.settings.write,
          })
        }>
        <FormattedMessage defaultMessage="Write" />
      </div>
    </div>
  );
}
