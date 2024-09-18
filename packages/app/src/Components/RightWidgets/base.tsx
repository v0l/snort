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
    <div className="br p bg-gray-ultradark">
      {title && (
        <div className="flex justify-between items-center">
          <div className="flex gap-2 items-center text-xl text-white font-semibold mb-1">
            {icon && (
              <div className="p-2 bg-gray-dark rounded-full">
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
