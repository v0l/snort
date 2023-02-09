import IconProps from "./IconProps";

const Repost = (props: IconProps) => {
  return (
    <svg width="22" height="20" viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M1 12C1 12 1.12132 12.8492 4.63604 16.364C8.15076 19.8787 13.8492 19.8787 17.364 16.364C18.6092 15.1187 19.4133 13.5993 19.7762 12M1 12V18M1 12H7M21 8C21 8 20.8787 7.15076 17.364 3.63604C13.8492 0.12132 8.15076 0.12132 4.63604 3.63604C3.39076 4.88131 2.58669 6.40072 2.22383 8M21 8V2M21 8H15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default Repost;
