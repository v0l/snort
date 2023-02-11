import IconProps from "./IconProps";

const Close = (props: IconProps) => {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M7.33332 0.666992L0.666656 7.33366M0.666656 0.666992L7.33332 7.33366"
        stroke="currentColor"
        strokeWidth="1.33333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default Close;
