import { useEffect, useState } from "react";
import FormattedMessage from "Element/FormattedMessage";
import { useInView } from "react-intersection-observer";

import messages from "./messages";

export default function LoadMore({
  onLoadMore,
  shouldLoadMore,
  children,
}: {
  onLoadMore: () => void;
  shouldLoadMore: boolean;
  children?: React.ReactNode;
}) {
  const { ref, inView } = useInView();
  const [tick, setTick] = useState<number>(0);

  useEffect(() => {
    if (inView === true && shouldLoadMore === true) {
      onLoadMore();
    }
  }, [inView, shouldLoadMore, tick]);

  useEffect(() => {
    const t = setInterval(() => {
      setTick(x => (x += 1));
    }, 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div ref={ref} className="mb10">
      {children ?? <FormattedMessage {...messages.Loading} />}
    </div>
  );
}
