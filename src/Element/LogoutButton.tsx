import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import { logout } from "State/Login";

export default function LogoutButton(){
  const dispatch = useDispatch()
  const navigate = useNavigate()
  return (
    <button className="secondary" type="button" onClick={() => { dispatch(logout()); navigate("/"); }}>
      Logout
    </button>
  )
}
