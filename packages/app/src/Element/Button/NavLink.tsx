import { NavLink as RouterNavLink, NavLinkProps, useLocation } from "react-router-dom";

export default function NavLink(props: NavLinkProps) {
  const { to, onClick, ...rest } = props;
  const location = useLocation();

  const isActive = location.pathname === to.toString();

  const handleClick = event => {
    if (onClick) {
      onClick(event);
    }

    if (isActive) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  return <RouterNavLink to={to} onClick={handleClick} {...rest} />;
}
