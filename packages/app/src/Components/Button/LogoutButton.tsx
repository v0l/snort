import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";

import useLogin from "@/Hooks/useLogin";
import { logout } from "@/Utils/Login";

import messages from "../messages";

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
