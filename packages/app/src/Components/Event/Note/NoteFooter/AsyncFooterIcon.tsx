import classNames from "classnames";

import { AsyncIcon, AsyncIconProps } from "@/Components/Button/AsyncIcon";
import { formatShort } from "@/Utils/Number";

export const AsyncFooterIcon = (props: AsyncIconProps & { value: number }) => {
  const mergedProps = {
    ...props,
    iconSize: 18,
    className: classNames(
      "transition duration-200 ease-in-out flex flex-row reaction-pill cursor-pointer gap-2 items-center",
      props.className,
    ),
  };

  return (
    <AsyncIcon {...mergedProps}>
      {props.value > 0 && <div className="reaction-pill-number">{formatShort(props.value)}</div>}
    </AsyncIcon>
  );
};
