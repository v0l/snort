import "./WarningNotice.css";
import Icon from "@/Icons/Icon";

export function WarningNotice({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      className="warning-notice"
      onClick={e => {
        e.stopPropagation();
        onClick?.();
      }}>
      <Icon name="alert-circle" size={24} />
      <div>{children}</div>
    </div>
  );
}
