import type { ConnectionType } from "@snort/system/dist/connection-pool"
import { FormattedMessage } from "react-intl"

import useLogin from "@/Hooks/useLogin"

export default function RelayPermissions({ conn }: { conn: ConnectionType }) {
  const { state } = useLogin(s => ({ v: s.state.version, state: s.state }))

  return (
    <div className="flex gap-2">
      <button
        type="button"
        className={conn.settings.read ? "" : "text-gray"}
        onClick={() =>
          state.updateRelay(conn.address, {
            read: !conn.settings.read,
            write: conn.settings.write,
          })
        }
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            state.updateRelay(conn.address, {
              read: !conn.settings.read,
              write: conn.settings.write,
            })
          }
        }}
      >
        <FormattedMessage defaultMessage="Read" />
      </button>
      <button
        type="button"
        className={conn.settings.write ? "" : "text-gray"}
        onClick={() =>
          state.updateRelay(conn.address, {
            read: conn.settings.read,
            write: !conn.settings.write,
          })
        }
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            state.updateRelay(conn.address, {
              read: conn.settings.read,
              write: !conn.settings.write,
            })
          }
        }}
      >
        <FormattedMessage defaultMessage="Write" />
      </button>
    </div>
  )
}
