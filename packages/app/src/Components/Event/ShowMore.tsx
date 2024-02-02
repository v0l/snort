import classNames from "classnames";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { FormattedMessage } from "react-intl";

interface ShowMoreProps {
  text?: string;
  className?: string;
  onClick: () => void;
}

const ShowMore = ({ text, onClick, className = "" }: ShowMoreProps) => {
  return (
    <div className="show-more-container">
      <button type="button" className={classNames("show-more", className)} onClick={onClick}>
        {text || <FormattedMessage defaultMessage="Show More" id="O8Z8t9" />}
      </button>
    </div>
  );
};

export default ShowMore;

export function AutoShowMore({ text, onClick, className }: ShowMoreProps) {
  const { ref, inView } = useInView({ rootMargin: "2000px" });

  useEffect(() => {
    if (inView) {
      onClick();
    }
  }, [inView]);

  return (
    <div ref={ref}>
      <ShowMore onClick={onClick} text={text} className={className} />
    </div>
  );
}
