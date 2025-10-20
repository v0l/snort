interface DividerProps {
  variant?: "regular" | "small";
}

export const Divider = ({ variant = "regular" }: DividerProps) => {
  return (
    <div className="divider-container">
      <div className={`h-px bg-border ${variant === "small" ? "ml-[77px] mr-4" : ""}`}></div>
    </div>
  );
};
