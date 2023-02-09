import IconProps from "./IconProps";

const Heart = (props: IconProps) => {
  return (
    <svg width="20" height="18" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.99425 3.315C8.32813 1.36716 5.54975 0.843192 3.4622 2.62683C1.37466 4.41048 1.08077 7.39264 2.72012 9.50216C4.08314 11.2561 8.2081 14.9552 9.56004 16.1525C9.7113 16.2865 9.78692 16.3534 9.87514 16.3798C9.95213 16.4027 10.0364 16.4027 10.1134 16.3798C10.2016 16.3534 10.2772 16.2865 10.4285 16.1525C11.7804 14.9552 15.9054 11.2561 17.2684 9.50216C18.9077 7.39264 18.6497 4.39171 16.5263 2.62683C14.4029 0.861954 11.6604 1.36716 9.99425 3.315Z"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default Heart;
