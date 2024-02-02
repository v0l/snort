import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { FormattedMessage } from "react-intl";

interface ShowMoreProps {
  text?: string;
  className?: string;
  onClick: () => void;
}

const LoadMore = ({ text, onClick, className = "" }: ShowMoreProps) => {
  return (
    <button type="button" className={className} onClick={onClick}>
      {text || <FormattedMessage defaultMessage="Load more" id="00LcfG" />}
    </button>
  );
};

export default LoadMore;

export function AutoLoadMore({ text, onClick, className }: ShowMoreProps) {
  const { ref, inView } = useInView({ rootMargin: "2000px" });

  useEffect(() => {
    if (inView) {
      onClick();
    }
  }, [inView]);

  return (
    <div ref={ref}>
      <LoadMore onClick={onClick} text={text} className={className} />
    </div>
  );
}
