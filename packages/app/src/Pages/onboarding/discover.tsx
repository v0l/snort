import { FormattedMessage } from "react-intl";
import { useLocation, useNavigate } from "react-router-dom";

import AsyncButton from "@/Components/Button/AsyncButton";
import TrendingUsers from "@/Components/Trending/TrendingUsers";

import type { NewUserState } from ".";

export default function Discover() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as NewUserState;

  return (
    <div className="flex flex-col gap-6">
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
          count={10}
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
