import { updateAppData, UserPreferences } from "@/Utils/Login";

import useEventPublisher from "./useEventPublisher";
import useLogin from "./useLogin";

export default function usePreferences() {
  const { id, pref } = useLogin(s => ({ id: s.id, pref: s.appData.json.preferences }));
  const { system } = useEventPublisher();

  return {
    preferences: pref,
    update: async (data: UserPreferences) => {
      await updateAppData(id, system, d => {
        return { ...d, preferences: data };
      });
    },
  };
}
