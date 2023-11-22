import useLogin from "../../Hooks/useLogin";
import { getCurrentSubscription } from "../../Subscription";
import { isChristmas, isHalloween, isStPatricksDay } from "../../SnortUtils";
import { Link } from "react-router-dom";
import { mapPlanName } from "../subscribe";
export function LogoHeader() {
  const { subscriptions } = useLogin();
  const currentSubscription = getCurrentSubscription(subscriptions);

  const extra = () => {
    if (isHalloween()) return "🎃";
    if (isStPatricksDay()) return "🍀";
    if (isChristmas()) return "🎄";
  };

  return (
    <Link to="/" className="logo">
      <h1 className="flex flex-row items-center">
        <img src={CONFIG.navLogo} className="w-8 h-8" />
        <div className="md:hidden xl:inline ml-2">
          {extra()}
          {CONFIG.appName}
        </div>
      </h1>
      {currentSubscription && (
        <div className="flex items-center g4 text-sm font-semibold tracking-wider">
          <Icon name="diamond" size={16} className="text-pro" />
          {mapPlanName(currentSubscription.type)}
        </div>
      )}
    </Link>
  );
}
