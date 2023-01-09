import { useEffect, useState } from "react";

export default function useScroll() {
    const [eop, setEop] = useState(false);

    function handleScroll(e) {
        let target = e.path[1];
        let y = target.scrollY + target.innerHeight;
        let h = e.target.scrollingElement.offsetHeight;
        let padding = 10;
        let atEnd = y + padding >= h;
        setEop((s) => {
            if (s !== atEnd) {
                return atEnd;
            }
            return s;
        });
    }

    useEffect(() => {
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return [eop];
}