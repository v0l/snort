import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";

import { logout } from "@/Login";
import useLogin from "@/Hooks/useLogin";
import messages from "./messages";

export default function LogoutButton() {
  const navigate = useNavigate();
  const login = useLogin(s => ({ publicKey: s.publicKey, id: s.id }));

  if (!login.publicKey) return;
  return (
    <button
      className="secondary"
      type="button"
      onClick={() => {
        logout(login.id);
        navigate("/");
      }}>
      <FormattedMessage {...messages.Logout} />
    </button>
  );
}
