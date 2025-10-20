import { ReactNode } from "react";

import Icon from "../Icons/Icon";

export interface BaseWidgetProps {
  title?: ReactNode;
  icon?: string;
  iconClassName?: string;
  children?: ReactNode;
  contextMenu?: ReactNode;
}
export function BaseWidget({ children, title, icon, iconClassName, contextMenu }: BaseWidgetProps) {
  return (
    <div className="border border-neutral-800 light:border-neutral-300 rounded-lg px-3 py-2 bg-neutral-900 light:bg-neutral-200">
      {title && (
        <div className="flex justify-between items-center">
          <div className="flex gap-2 items-center text-xl font-semibold mb-2">
            {icon && (
              <div className="p-2 bg-neutral-800 rounded-full">
                <Icon name={icon} className={iconClassName} />
              </div>
            )}
            <div>{title}</div>
          </div>
          {contextMenu}
        </div>
      )}
      {children}
    </div>
  );
}
