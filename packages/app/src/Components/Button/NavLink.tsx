import { NavLink as RouterNavLink, NavLinkProps, useLocation } from "react-router-dom";

export default function NavLink(props: NavLinkProps) {
  const { to, onClick, ...rest } = props;
  const location = useLocation();

  const isActive = location.pathname === to.toString();

  return (
    <RouterNavLink
      to={to}
      onClick={e => {
        onClick?.(e);
        if (isActive) {
          window.scrollTo({ top: 0, behavior: "instant" });
        }
      }}
      {...rest}
    />
  );
}
