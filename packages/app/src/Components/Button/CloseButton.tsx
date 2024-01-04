import classNames from "classnames";

import Icon from "@/Components/Icons/Icon";

export default function CloseButton({ onClick, className }: { onClick?: () => void; className?: string }) {
  return (
    <div
      onClick={onClick}
      className={classNames(
        "self-center circle flex flex-shrink-0 flex-grow-0 items-center justify-center hover:opacity-80 bg-dark p-2 cursor-pointer",
        className,
      )}>
      <Icon name="close" size={12} />
    </div>
  );
}
