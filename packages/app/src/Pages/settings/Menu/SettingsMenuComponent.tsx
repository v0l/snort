import classNames from "classnames";
import { Link } from "react-router-dom";

import Icon from "@/Components/Icons/Icon";
import { SettingsMenuItems } from "@/Pages/settings/Menu/Menu";

export function SettingsMenuComponent({ menu }: { menu: SettingsMenuItems }) {
  return (
    <div className="flex flex-col">
      {menu.map((group, groupIndex) => (
        <div key={groupIndex} className="mb-4">
          <div className="p-2 font-bold uppercase text-secondary text-xs tracking-wide">{group.title}</div>
          {group.items.map(({ icon, iconBg, message, path, action }, index) => (
            <Link
              to={path || "#"}
              onClick={action}
              key={path || index}
              className={classNames("px-2.5 py-1.5 flex justify-between items-center border border-border-color", {
                "rounded-t-xl": index === 0,
                "rounded-b-xl": index === group.items.length - 1,
                "border-t-0": index !== 0,
              })}>
              <div className="flex items-center gap-3">
                <div className={`p-1 ${iconBg} rounded-lg flex justify-center items-center text-white`}>
                  <Icon name={icon} size={18} className="relative" />
                </div>
                <span className="text-base font-semibold flex-grow">{message}</span>
              </div>
              <Icon name="arrowFront" size={12} className="text-secondary" />
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
