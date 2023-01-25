import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";

export default function LoadMore({ onLoadMore, shouldLoadMore }: { onLoadMore: () => void, shouldLoadMore: boolean }) {
    const { ref, inView } = useInView();
    const [tick, setTick] = useState<number>(0);

    useEffect(() => {
        if (inView === true && shouldLoadMore === true) {
            onLoadMore();
        }
    }, [inView, shouldLoadMore, tick]);

    useEffect(() => {
        let t = setInterval(() => {
            setTick(x => x += 1);
        }, 500);
        return () => clearInterval(t);
    }, []);

    return <div ref={ref} className="mb10">Loading...</div>;
}