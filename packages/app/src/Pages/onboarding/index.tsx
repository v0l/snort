import "./index.css";

import { Outlet, RouteObject } from "react-router-dom";

import Icon from "@/Components/Icons/Icon";
import { AllLanguageCodes, useLocale } from "@/Components/IntlProvider/IntlProviderUtils";

import { Discover } from "./discover";
import { Moderation } from "./moderation";
import { Profile } from "./profile";
import { SignIn, SignUp } from "./start";
import { Topics } from "./topics";

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
