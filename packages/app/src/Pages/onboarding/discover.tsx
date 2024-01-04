import { FormattedMessage } from "react-intl";
import { useLocation, useNavigate } from "react-router-dom";
import AsyncButton from "@/Components/Button/AsyncButton";
import { NewUserState } from ".";
import TrendingUsers from "@/Components/Trending/TrendingUsers";

export function Discover() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as NewUserState;

  return (
    <div className="flex flex-col g24">
      <h1 className="text-center">
        <FormattedMessage
          defaultMessage="{site} is more fun together!"
          id="h7jvCs"
          values={{
            site: CONFIG.appNameCapitalized,
          }}
        />
      </h1>
      <div className="new-trending">
        <TrendingUsers
          title={
            <h3>
              <FormattedMessage defaultMessage="Trending Users" id="FSYL8G" />
            </h3>
          }
        />
      </div>
      <AsyncButton
        className="primary"
        onClick={() =>
          navigate(CONFIG.signUp.moderation ? "/login/sign-up/moderation" : "/", {
            state,
          })
        }>
        <FormattedMessage defaultMessage="Next" id="9+Ddtu" />
      </AsyncButton>
    </div>
  );
}
