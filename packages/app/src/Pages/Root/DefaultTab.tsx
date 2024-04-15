import useLogin from "@/Hooks/useLogin";
import { RootTabRoutes } from "@/Pages/Root/RootTabRoutes";

export const DefaultTab = () => {
  const { preferences, publicKey } = useLogin(s => ({
    preferences: s.appData.json.preferences,
    publicKey: s.publicKey,
  }));
  const tab = publicKey ? preferences.defaultRootTab : `trending/notes`;
  const elm = RootTabRoutes.find(a => a.path === tab)?.element;
  return elm ?? RootTabRoutes.find(a => a.path === preferences.defaultRootTab)?.element;
};
