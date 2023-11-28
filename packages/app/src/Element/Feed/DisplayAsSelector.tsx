import { FormattedMessage } from "react-intl";

export type DisplayAs = "grid" | "feed";

type DisplaySelectorProps = {
  activeSelection: DisplayAs;
  onSelect: (display: DisplayAs) => void;
};

export const DisplayAsSelector = ({ activeSelection, onSelect }: DisplaySelectorProps) => {
  return (
    <div className="flex mb-4">
      <div
        className={`border-highlight cursor-pointer flex justify-center flex-1 p-3 ${
          activeSelection === "feed" ? "border-b border-1" : "hover:bg-nearly-bg-color text-secondary"
        }`}
        onClick={() => onSelect("feed")}>
        <FormattedMessage defaultMessage="Feed" id="eW/Bj9" />
      </div>
      <div
        className={`border-highlight cursor-pointer flex justify-center flex-1 p-3 ${
          activeSelection === "grid" ? "border-b border-1" : "hover:bg-nearly-bg-color text-secondary"
        }`}
        onClick={() => onSelect("grid")}>
        <FormattedMessage defaultMessage="Grid" id="HzfrYu" />
      </div>
    </div>
  );
};
