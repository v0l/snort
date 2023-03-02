type Props = {
  name: string;
  size?: number;
  className?: string;
}

const Icon = (props: Props) => {
  const size = props.size || 16;
  const href = 'icons.svg#' + props.name;

  return (
    <svg width={size} height={size} className={props.className}>
      <use href={href} />
    </svg>
  );
};

export default Icon;
