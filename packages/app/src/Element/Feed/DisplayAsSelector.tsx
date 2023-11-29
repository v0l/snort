import Icon from "@/Icons/Icon";
import { LoginStore } from "@/Login";
import useLogin from "@/Hooks/useLogin";

export type DisplayAs = "list" | "grid";

type DisplaySelectorProps = {
  activeSelection: DisplayAs;
  onSelect: (display: DisplayAs) => void;
  show?: boolean;
};

export const DisplayAsSelector = ({ activeSelection, onSelect, show }: DisplaySelectorProps) => {
  const state = useLogin();

  const myOnSelect = (display: DisplayAs) => {
    onSelect(display);
    state.feedDisplayAs = display;
    LoginStore.updateSession(state);
  };

  if (show === false) return null;
  return (
    <div className="flex mb-px md:mb-1">
      <div
        className={`border-highlight cursor-pointer flex justify-center flex-1 p-3 ${
          activeSelection === "list" ? "border-b border-1" : "hover:bg-nearly-bg-color text-secondary"
        }`}
        onClick={() => myOnSelect("list")}>
        <span className="rotate-90">
          <Icon name="deck" />
        </span>
      </div>
      <div
        className={`border-highlight cursor-pointer flex justify-center flex-1 p-3 ${
          activeSelection === "grid" ? "border-b border-1" : "hover:bg-nearly-bg-color text-secondary"
        }`}
        onClick={() => myOnSelect("grid")}>
        <Icon name="media" />
      </div>
    </div>
  );
};
