import useLogin from "../../Hooks/useLogin";
import { getCurrentSubscription } from "../../Subscription";
import { isBirthday, isChristmas, isHalloween, isStPatricksDay } from "../../SnortUtils";
import { Link } from "react-router-dom";
import { mapPlanName } from "../subscribe";
import Icon from "@/Icons/Icon";
import { unixNowMs } from "@snort/shared";
import { Birthday, Day } from "@/Const";

export function LogoHeader({ showText = false }) {
  const { subscriptions } = useLogin();
  const currentSubscription = getCurrentSubscription(subscriptions);

  const extra = () => {
    if (isBirthday()) {
      const age = (unixNowMs() - Birthday.getTime()) / (Day * 365_000);
      return <span className="text-xs">{age.toFixed(0)}st 🎂</span>;
    }
    if (isHalloween()) return "🎃";
    if (isStPatricksDay()) return "🍀";
    if (isChristmas()) return "🎄";
  };

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  return (
    <Link to="/" className="logo" onClick={handleLogoClick}>
      <h1 className="flex flex-row items-center md:justify-center">
        {CONFIG.navLogo && <img src={CONFIG.navLogo} className="w-8" />}
        {!CONFIG.navLogo && (
          <span className="text-2xl p-5 hidden md:flex xl:hidden w-8 h-8 rounded-xl bg-dark text-xl font-bold flex items-center justify-center">
            {CONFIG.appName[0]}
          </span>
        )}
        {showText && (
          <div className="md:hidden xl:inline ml-2">
            {CONFIG.appName}
            {extra()}
          </div>
        )}
      </h1>
      {currentSubscription && (
        <div className="flex items-center g4 text-sm font-semibold tracking-wider xl:ml-2">
          <Icon name="diamond" size={16} className="text-pro" />
          {mapPlanName(currentSubscription.type)}
        </div>
      )}
    </Link>
  );
}
