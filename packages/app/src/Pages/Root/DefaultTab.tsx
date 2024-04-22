import useLogin from "@/Hooks/useLogin";
import usePreferences from "@/Hooks/usePreferences";
import { RootTabRoutes } from "@/Pages/Root/RootTabRoutes";

export const DefaultTab = () => {
  const { publicKey } = useLogin(s => ({
    publicKey: s.publicKey,
  }));
  const defaultRootTab = usePreferences(s => s.defaultRootTab);
  const tab = publicKey ? defaultRootTab : `trending/notes`;
  const elm = RootTabRoutes.find(a => a.path === tab)?.element;
  return elm ?? RootTabRoutes.find(a => a.path === defaultRootTab)?.element;
};
