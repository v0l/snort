import { MouseEventHandler } from "react";
import IconsSvg from "public/icons.svg";

type Props = {
  name: string;
  size?: number;
  className?: string;
  onClick?: MouseEventHandler<SVGSVGElement>;
};

const Icon = (props: Props) => {
  const size = props.size || 20;
  const href = `${IconsSvg}#` + props.name;

  return (
    <svg width={size} height={size} className={props.className} onClick={props.onClick}>
      <use href={href} />
    </svg>
  );
};

export default Icon;
