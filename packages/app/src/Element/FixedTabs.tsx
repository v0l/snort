import "./FixedTabs.css";
import { ReactNode } from "react";

export function FixedTabs({ children }: { children: ReactNode }) {
  return <div className="fixed-tabs">{children}</div>;
}
