import { MouseEventHandler } from "react";
import IconsSvg from "/icons.svg?url";

export interface IconProps {
  name: string;
  size?: number;
  height?: number;
  className?: string;
  onClick?: MouseEventHandler<SVGSVGElement>;
}

const Icon = (props: IconProps) => {
  const size = props.size || 20;
  const href = `${IconsSvg}#` + props.name;

  return (
    <svg width={size} height={props.height ?? size} className={props.className} onClick={props.onClick}>
      <use href={href} />
    </svg>
  );
};

export default Icon;
