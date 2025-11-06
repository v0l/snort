import Icon from "@/Components/Icons/Icon";

export function WarningNotice({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      className="text-warning border px-4 py-2 rounded-lg flex gap-2 items-center font-bold"
      onClick={e => {
        e.stopPropagation();
        onClick?.();
      }}>
      <Icon name="alert-circle" size={26} />
      <div>{children}</div>
    </div>
  );
}
