import { FormattedMessage } from "react-intl"
import { Link } from "react-router-dom"

import ProfilePreview from "@/Components/User/ProfilePreview"
import { LoginStore } from "@/Utils/Login"
import useLogin from "@/Hooks/useLogin"
import { useSessions } from "@/Hooks/useSessions"
import { logout } from "@/Utils/Login"

export default function AccountsPage() {
  const activeId = useLogin(s => s.id)
  const logins = useSessions()

  return (
    <div className="flex flex-col gap-2">
      <h3>
        <FormattedMessage defaultMessage="Logins" />
      </h3>
      {logins.map(a => (
        <div key={a.id}>
          <ProfilePreview
            pubkey={a.pubkey}
            options={{
              about: false,
            }}
            actions={
              <div className="align-end flex gap-2">
                {a.id === activeId ? (
                  <span className="text-sm text-neutral-400">
                    <FormattedMessage defaultMessage="Active" />
                  </span>
                ) : (
                  <button onClick={() => LoginStore.switchAccount(a.id)}>
                    <FormattedMessage defaultMessage="Switch" />
                  </button>
                )}
                <button onClick={() => logout(a.id)}>
                  <FormattedMessage defaultMessage="Logout" />
                </button>
              </div>
            }
          />
        </div>
      ))}

      <Link to={"/login"}>
        <button type="button">
          <FormattedMessage defaultMessage="Add Account" />
        </button>
      </Link>
    </div>
  )
}
