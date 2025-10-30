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
    <div className="layer-1">
      {title && (
        <div className="flex justify-between items-center">
          <div className="flex gap-2 items-center text-xl font-semibold mb-2">
            {icon && (
              <div className="layer-2 rounded-full">
                <Icon name={icon} className={iconClassName} />
              </div>
            )}
            {title}
          </div>
          {contextMenu}
        </div>
      )}
      {children}
    </div>
  );
}
