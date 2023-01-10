import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';

export default function LazyImage(props) {
    const { ref, inView, entry } = useInView();
    const [shown, setShown] = useState(false);

    useEffect(() => {
        setShown(s => {
            if (!s && inView) {
                return true;
            }
            return s;
        })
    }, [inView]);

    return (
        <div ref={ref}>
            {shown ? <img {...props} /> : null}
        </div>
    )
}