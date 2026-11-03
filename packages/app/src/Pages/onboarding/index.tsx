import { Outlet } from "react-router-dom"

import Icon from "@/Components/Icons/Icon"
import { AllLanguageCodes } from "@/Components/IntlProvider/IntlProviderUtils"
import { useLocale } from "@/Components/IntlProvider/useLocale"
import { useHydrated } from "@/Hooks/useHydrated"

import Discover from "./discover"
import Moderation from "./moderation"
import Profile from "./profile"
import SignIn from "./sign-in"
import SignUp from "./sign-up"
import Topics from "./topics"

export { Discover, Moderation, Profile, SignIn, SignUp, Topics }

export interface NewUserState {
  name?: string
  picture?: string
  topics?: Array<string>
  muteLists?: Array<string>
}

export function OnboardingLayout() {
  const { lang, setOverride } = useLocale()
  const hydrated = useHydrated()

  return (
    <div className="p-6">
      <div className="float-right flex gap-2 items-center">
        <Icon name="translate" />
        <select value={lang} onChange={e => setOverride(e.target.value)} className="capitalize">
          {AllLanguageCodes.sort().map(a => (
            <option key={a} value={a}>
              {hydrated
                ? new Intl.DisplayNames([a], {
                    type: "language",
                  }).of(a)
                : a}
            </option>
          ))}
        </select>
      </div>
      <div className="w-[460px] max-w-full mx-auto my-auto mt-[15vh] rounded-lg px-8 py-7 layer-1">
        <Outlet />
      </div>
    </div>
  )
}
