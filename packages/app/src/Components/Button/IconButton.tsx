import classNames from "classnames";
import type { ReactNode } from "react";

import Icon, { type IconProps } from "@/Components/Icons/Icon";

interface IconButtonProps {
  onClick?: () => void;
  icon: IconProps;
  className?: string;
  children?: ReactNode;
}

const IconButton = ({ onClick, icon, children, className }: IconButtonProps) => {
  return (
    <button
      className={classNames(
        "flex items-center justify-center aspect-square w-10 h-10 !p-0 !m-0 bg-neutral-800 text-white",
        className,
      )}
      onClick={onClick}>
      <Icon {...icon} />
      {children}
    </button>
  );
};

export default IconButton;
