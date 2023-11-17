import { FormattedMessage } from "react-intl";
import { useLocation, useNavigate } from "react-router-dom";
import AsyncButton from "@/Element/AsyncButton";
import { NewUserState } from ".";
import TrendingUsers from "@/Element/TrendingUsers";

export function Discover() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as NewUserState;

  return (
    <div className="flex flex-col g24">
      <h1 className="text-center">
        <FormattedMessage
          defaultMessage="{site} is more fun together!"
          values={{
            site: CONFIG.appNameCapitalized,
          }}
        />
      </h1>
      <div className="new-trending">
        <TrendingUsers
          title={
            <h3>
              <FormattedMessage defaultMessage="Trending Users" />
            </h3>
          }
        />
      </div>
      <AsyncButton
        className="primary"
        onClick={() =>
          navigate("/login/sign-up/moderation", {
            state,
          })
        }>
        <FormattedMessage defaultMessage="Next" />
      </AsyncButton>
    </div>
  );
}
