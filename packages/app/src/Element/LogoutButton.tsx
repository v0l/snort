import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FormattedMessage } from "react-intl";

import { logout } from "State/Login";

import messages from "./messages";

export default function LogoutButton() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  return (
    <button
      className="secondary"
      type="button"
      onClick={() => {
        dispatch(logout());
        navigate("/");
      }}>
      <FormattedMessage {...messages.Logout} />
    </button>
  );
}
