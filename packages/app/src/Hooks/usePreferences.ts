import { DefaultPreferences, saveAppData, updateAppData, type UserPreferences } from "@/Utils/Login"

import useLogin from "./useLogin"

export default function usePreferences<T = UserPreferences>(selector?: (v: UserPreferences) => T): T {
  const defaultSelector = (v: UserPreferences) => v as unknown as T
  return useLogin(s => {
    // stored preferences predate newer keys, defaults fill in the gaps
    const pref = {
      ...DefaultPreferences,
      ...CONFIG.defaultPreferences,
      ...s.state.appdata?.preferences,
    }

    return (selector || defaultSelector)(pref)
  })
}

export function useAllPreferences() {
  const { id, pref } = useLogin(s => {
    // stored preferences predate newer keys, defaults fill in the gaps
    const pref = {
      ...DefaultPreferences,
      ...CONFIG.defaultPreferences,
      ...s.state.appdata?.preferences,
    }

    return {
      id: s.id,
      pref: pref,
    }
  })
  return {
    preferences: pref,
    update: (data: UserPreferences) => {
      updateAppData(id, d => {
        return { ...d, preferences: data }
      })
    },
    save: async () => {
      await saveAppData(id)
    },
  }
}
