import "./index.css";
import { Outlet, RouteObject } from "react-router-dom";
import { SignIn, SignUp } from "./start";
import { AllLanguageCodes } from "@/Pages/settings/Preferences";
import Icon from "@/Icons/Icon";
import { Profile } from "./profile";
import { Topics } from "./topics";
import { Discover } from "./discover";
import { useLocale } from "@/IntlProvider";
import { Moderation } from "./moderation";

export interface NewUserState {
  name?: string;
  picture?: string;
  topics?: Array<string>;
  muteLists?: Array<string>;
}

function OnboardingLayout() {
  const { lang, setOverride } = useLocale();

  return (
    <div className="p24">
      <div className="float-right flex g8 items-center">
        <Icon name="translate" />
        <select value={lang} onChange={e => setOverride(e.target.value)} className="capitalize">
          {AllLanguageCodes.sort().map(a => (
            <option key={a} value={a}>
              {new Intl.DisplayNames([a], {
                type: "language",
              }).of(a)}
            </option>
          ))}
        </select>
      </div>
      <div className="onboarding-modal">
        <Outlet />
      </div>
    </div>
  );
}

export const OnboardingRoutes = [
  {
    path: "/login",
    element: <OnboardingLayout />,
    children: [
      {
        path: "",
        element: <SignIn />,
      },
      {
        path: "sign-up",
        element: <SignUp />,
      },
      {
        path: "sign-up/profile",
        element: <Profile />,
      },
      {
        path: "sign-up/topics",
        element: <Topics />,
      },
      {
        path: "sign-up/discover",
        element: <Discover />,
      },
      {
        path: "sign-up/moderation",
        element: <Moderation />,
      },
    ],
  },
] as Array<RouteObject>;
