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
      <h1>
        {extra()}
        {CONFIG.appName}
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
