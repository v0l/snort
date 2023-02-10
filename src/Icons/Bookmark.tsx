import IconProps from "./IconProps";

const Bookmark = (props: IconProps) => {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M1.3335 4.2C1.3335 3.0799 1.3335 2.51984 1.55148 2.09202C1.74323 1.71569 2.04919 1.40973 2.42552 1.21799C2.85334 1 3.41339 1 4.5335 1H7.46683C8.58693 1 9.14699 1 9.57481 1.21799C9.95114 1.40973 10.2571 1.71569 10.4488 2.09202C10.6668 2.51984 10.6668 3.0799 10.6668 4.2V13L6.00016 10.3333L1.3335 13V4.2Z"
        stroke="currentColor"
        strokeWidth="1.33333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default Bookmark;
