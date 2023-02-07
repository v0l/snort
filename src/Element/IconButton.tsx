import type { ReactNode } from "react";

interface IconButtonProps {
  onClick(): void;
  children: ReactNode;
}

const IconButton = ({ onClick, children }: IconButtonProps) => {
  return (
    <button className="icon" type="button" onClick={onClick}>
      <div className="icon-wrapper">{children}</div>
    </button>
  );
};

export default IconButton;
