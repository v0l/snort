import Icon from "@/Components/Icons/Icon";

export function WarningNotice({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      className="text-tertiary border border-border px-4 py-2 rounded-xl flex gap-2"
      onClick={e => {
        e.stopPropagation();
        onClick?.();
      }}>
      <Icon name="alert-circle" size={24} className="text-warning" />
      <div>{children}</div>
    </div>
  );
}
