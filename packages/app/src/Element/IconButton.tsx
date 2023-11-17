import classNames from "classnames";
import Icon, { IconProps } from "@/Icons/Icon";
import type { ReactNode } from "react";

interface IconButtonProps {
  onClick?: () => void;
  icon: IconProps;
  className?: string;
  children?: ReactNode;
}

const IconButton = ({ onClick, icon, children, className }: IconButtonProps) => {
  return (
    <button className={classNames("icon", className)} type="button" onClick={onClick}>
      <Icon {...icon} />
      {children}
    </button>
  );
};

export default IconButton;
