export default function AwardIcon({ size }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 62 62" fill="none" className="award">
      <defs>
        <linearGradient
          id="paint0_linear_2660_40043"
          x1="31"
          y1="3.57143"
          x2="31"
          y2="58.4286"
          gradientUnits="userSpaceOnUse">
          <stop stop-color="#5B2CB3" />
          <stop offset="1" stop-color="#811EFF" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_2660_40043"
          x1="15.5594"
          y1="24.305"
          x2="46.433"
          y2="24.305"
          gradientUnits="userSpaceOnUse">
          <stop stop-color="#AC88FF" />
          <stop offset="1" stop-color="#7234FF" />
        </linearGradient>
      </defs>
      <g id="award-02">
        <rect x="1.85713" y="1.85714" width="58.2857" height="58.2857" rx="29.1429" fill="#AC88FF" fill-opacity="0.2" />
        <rect
          x="1.85713"
          y="1.85714"
          width="58.2857"
          height="58.2857"
          rx="29.1429"
          stroke="url(#paint0_linear_2660_40043)"
          strokeWidth="3.42857"
        />
        <path
          id="Solid"
          d="M23.2006 52.4983L22.5639 50.9066L23.2006 52.4983L30.9963 49.38L38.7919 52.4983C39.8813 52.934 41.116 52.801 42.0876 52.1432C43.0592 51.4854 43.6412 50.3885 43.6412 49.2151V38.1015C46.467 35.038 48.1957 30.9408 48.1957 26.4427C48.1957 16.9437 40.4952 9.24329 30.9963 9.24329C21.4973 9.24329 13.7968 16.9437 13.7968 26.4427C13.7968 30.9408 15.5255 35.038 18.3513 38.1015V49.2151C18.3513 50.3885 18.9333 51.4854 19.9049 52.1432C20.8765 52.801 22.1112 52.934 23.2006 52.4983ZM27.2967 43.2429L25.4234 43.9922V42.7187C26.0332 42.9275 26.6584 43.1029 27.2967 43.2429ZM34.6958 43.2429C35.3341 43.1029 35.9593 42.9275 36.5691 42.7187V43.9922L34.6958 43.2429Z"
          fill="url(#paint1_linear_2660_40043)"
          stroke="#251250"
          strokeWidth="3.42857"
          strokeLinecap="round"
        />
        <path
          id="Ellipse 1595"
          d="M24.2557 14.6002C17.7766 18.3409 15.5567 26.6257 19.2974 33.1049L42.7604 19.5585C39.0196 13.0794 30.7348 10.8595 24.2557 14.6002Z"
          fill="white"
          fill-opacity="0.1"
        />
      </g>
    </svg>
  );
}
