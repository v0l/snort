import { useNavigate } from "react-router-dom";

const Logo = () => {
  const navigate = useNavigate();
  return (
    <h1 className="logo" onClick={() => navigate("/")}>
      {CONFIG.appNameCapitalized}
    </h1>
  );
};

export default Logo;
