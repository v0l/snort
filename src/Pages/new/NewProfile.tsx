import ProfileSettings from "Pages/settings/Profile";
import { useNavigate } from "react-router-dom";

export default function NewUserProfile() {
  const navigate = useNavigate();
  return (
    <>
      <h1>Setup your Profile</h1>
      <ProfileSettings privateKey={false} banner={false} />
      <button onClick={() => navigate("/new/import")}>Next</button>
    </>
  );
}
