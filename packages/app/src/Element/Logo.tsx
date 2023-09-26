import { useNavigate } from "react-router-dom";

const Logo = () => {
  const navigate = useNavigate();
  return (
    <h1 className="logo" onClick={() => navigate("/")}>
      {process.env.APP_NAME}
    </h1>
  );
};

export default Logo;
