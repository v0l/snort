import Icon from "@/Icons/Icon";

export type DisplayAs = "grid" | "feed";

type DisplaySelectorProps = {
  activeSelection: DisplayAs;
  onSelect: (display: DisplayAs) => void;
  show?: boolean;
};

export const DisplayAsSelector = ({ activeSelection, onSelect, show }: DisplaySelectorProps) => {
  if (show === false) return null;
  return (
    <div className="flex mb-4">
      <div
        className={`border-highlight cursor-pointer flex justify-center flex-1 p-3 ${
          activeSelection === "feed" ? "border-b border-1" : "hover:bg-nearly-bg-color text-secondary"
        }`}
        onClick={() => onSelect("feed")}>
        <span className="rotate-90">
          <Icon name="deck" />
        </span>
      </div>
      <div
        className={`border-highlight cursor-pointer flex justify-center flex-1 p-3 ${
          activeSelection === "grid" ? "border-b border-1" : "hover:bg-nearly-bg-color text-secondary"
        }`}
        onClick={() => onSelect("grid")}>
        <Icon name="media" />
      </div>
    </div>
  );
};
