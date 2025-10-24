import { forwardRef, MouseEventHandler } from "react";

import IconsSvg from "@/Components/Icons/icons.svg";

export interface IconProps {
  name: string;
  size?: number;
  height?: number;
  className?: string;
  onClick?: MouseEventHandler<SVGSVGElement>;
}

const Icon = forwardRef<SVGSVGElement, IconProps>((props, ref) => {
  const size = props.size || 20;
  const href = `${IconsSvg}#` + props.name;

  return (
    <svg ref={ref} width={size} height={props.height ?? size} className={props.className} onClick={props.onClick}>
      <use href={href} />
    </svg>
  );
});

export default Icon;
