import { forwardRef, HTMLProps } from "react";

import IconsSvg from "@/Components/Icons/icons.svg";

export type IconProps = {
  name: string;
  size?: number;
} & Omit<HTMLProps<SVGSVGElement>, "src" | "href" | "width" | "height">;

const Icon = forwardRef<SVGSVGElement, IconProps>(({ name, size, ...props }, ref) => {
  size ??= 20;
  return (
    <svg ref={ref} {...props} width={size} height={size}>
      <use href={`${IconsSvg}#${name}`} />
    </svg>
  );
});

export default Icon;
