import Icon from "@/Icons/Icon";
import { LoginStore } from "@/Login";
import useLogin from "@/Hooks/useLogin";
import { useCallback } from "react";

export type DisplayAs = "list" | "grid";

type DisplaySelectorProps = {
  activeSelection: DisplayAs;
  onSelect: (display: DisplayAs) => void;
  show?: boolean;
};

export const DisplayAsSelector = ({ activeSelection, onSelect, show }: DisplaySelectorProps) => {
  const state = useLogin();

  const getClasses = (displayType: DisplayAs) => {
    const baseClasses = "border-highlight cursor-pointer flex justify-center flex-1 p-3";
    return activeSelection === displayType
      ? `${baseClasses} border-b border-1`
      : `${baseClasses} hover:bg-nearly-bg-color text-secondary`;
  };

  const myOnSelect = useCallback(
    (display: DisplayAs) => {
      onSelect(display);
      const updatedState = { ...state, feedDisplayAs: display };
      LoginStore.updateSession(updatedState);
    },
    [onSelect, state],
  );

  if (show === false) return null;

  return (
    <div className="flex mb-px md:mb-1">
      <div className={getClasses("list")} onClick={() => myOnSelect("list")}>
        <span className="rotate-90">
          <Icon name="deck-solid" />
        </span>
      </div>
      <div className={getClasses("grid")} onClick={() => myOnSelect("grid")}>
        <Icon name="media" />
      </div>
    </div>
  );
};
