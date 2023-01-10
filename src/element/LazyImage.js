import { useInView } from 'react-intersection-observer';

export default function LazyImage(props) {
    const { ref, inView, entry } = useInView();

    return (
        <div ref={ref}>
            {inView ? <img {...props} /> : null}
        </div>
    )
}