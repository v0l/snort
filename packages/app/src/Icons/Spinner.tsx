import IconProps from "./IconProps";
import "./Spinner.css";

const Spinner = (props: IconProps) => (
  <svg
    width={props.width ?? 20}
    height={props.height ?? 20}
    stroke="currentColor"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
    {...props}>
    <g className="spinner_V8m1">
      <circle cx="10" cy="10" r="7.5" fill="none" strokeWidth="3"></circle>
    </g>
  </svg>
);

export default Spinner;
