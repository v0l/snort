const Spinner = (props: { width?: number; height?: number; className?: string }) => (
  <svg
    width={props.width ?? 20}
    height={props.height ?? 20}
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    {...props}>
    <g className="origin-center animate-spin">
      <circle
        cx="10"
        cy="10"
        r="7.5"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="30 70"></circle>
    </g>
  </svg>
);

export default Spinner;
