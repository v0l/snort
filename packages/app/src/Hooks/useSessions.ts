import useLogin from "@/Hooks/useLogin"
import { useHydrated } from "@/Hooks/useHydrated"
import { LoginStore } from "@/Utils/Login"

export function useSessions() {
  useLogin(s => s.id)
  const hydrated = useHydrated()
  return hydrated ? LoginStore.getSessions() : []
}
