import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { FormattedMessage } from "react-intl";
import usePageDimensions from "@/Hooks/usePageDimensions";
import {debounce} from "@/Utils";

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
  const { ref, inView } = useInView({ rootMargin: "1000px" });
  const { height } = usePageDimensions();

  useEffect(() => {
    if (inView) {
      // TODO improve feed performance. Something in image grid makes it slow when feed size grows.
      return debounce(100, onClick);
    }
  }, [inView, height]);

  return (
    <div ref={ref}>
      <LoadMore onClick={onClick} text={text} className={className} />
    </div>
  );
}
