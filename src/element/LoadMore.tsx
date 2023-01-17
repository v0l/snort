import { useEffect } from "react";
import { useInView } from "react-intersection-observer";

export default function LoadMore({ onLoadMore }: { onLoadMore: () => void }) {
    const { ref, inView } = useInView();

    useEffect(() => {
        if (inView === true) {
            onLoadMore();
        }
    }, [inView]);
    return <div ref={ref} className="mb10">Loading...</div>;
}