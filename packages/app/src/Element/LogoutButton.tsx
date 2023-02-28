import { useDispatch } from "react-redux";
import { FormattedMessage } from "react-intl";

import { logout } from "State/Login";

import messages from "./messages";

export default function LogoutButton() {
  const dispatch = useDispatch();
  return (
    <button
      className="secondary"
      type="button"
      onClick={() => {
        dispatch(logout());
        window.location.href = "/";
      }}>
      <FormattedMessage {...messages.Logout} />
    </button>
  );
}
