import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router-dom"

import Icon from "@/Components/Icons/Icon"
import useKeyboardShortcut from "@/Hooks/useKeyboardShortcut"
import useLogin from "@/Hooks/useLogin"
import ProfileMenu from "@/Pages/Layout/ProfileMenu"
import { isFormElement } from "@/Utils"

export default function HeaderAccount() {
  const navigate = useNavigate()
  const publicKey = useLogin(s => s.publicKey)

  useKeyboardShortcut("/", event => {
    if (event.target && !isFormElement(event.target as HTMLElement)) {
      event.preventDefault()
      document.querySelector<HTMLInputElement>(".search input")?.focus()
    }
  })

  if (!publicKey) {
    return (
      <button
        type="button"
        onClick={() => navigate("/login/sign-up")}
        className="mr-1 primary p-2"
        aria-label="Sign up"
      >
        <Icon name="sign-in" size={20} />
        <span className="sr-only">
          <FormattedMessage defaultMessage="Sign up" />
        </span>
      </button>
    )
  }
  return <ProfileMenu compact={true} />
}
