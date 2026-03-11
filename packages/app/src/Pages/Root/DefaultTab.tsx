import { Navigate } from 'react-router-dom'
import useLogin from '@/Hooks/useLogin'
import usePreferences from '@/Hooks/usePreferences'

export const DefaultTab = () => {
  const { publicKey } = useLogin(s => ({
    publicKey: s.publicKey,
  }))
  const defaultRootTab = usePreferences(s => s.defaultRootTab)
  const tab = publicKey ? defaultRootTab : `trending/notes`
  return <Navigate to={`/${tab}`} replace />
}
