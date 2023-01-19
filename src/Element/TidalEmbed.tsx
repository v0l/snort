import { useEffect, useMemo } from "react";
import { TidalRegex } from "../Const";

const TidalEmbed = ({ link }: { link: string }) => {
    // https://tidal.com/browse/mix/0029457ec7eed3b340ee2b907fc4d8
    // https://tidal.com/browse/track/168295350
    // https://tidal.com/browse/album/168295347
    // https://tidal.com/browse/playlist/4261748a-4287-4758-aaab-6d5be3e99e52   

    const data = useMemo(() => {
        const match = link.match(TidalRegex);
        if (match?.length != 3) {
            return null;
        }
        let type = match[1][0];
        let id = match[2];
        return { type, id };
    }, [link]);

    const ScriptSrc = "https://embed.tidal.com/tidal-embed.js";
    useEffect(() => {
        let head = document.head.querySelector(`script[src="${ScriptSrc}"]`);
        console.debug(head);
        if (!head) {
            let sTag = document.createElement("script");
            sTag.src = ScriptSrc;
            sTag.async = true;
            document.head.appendChild(sTag);
        }
    }, []);

    return (
        <>
            <div className="tidal-embed" data-type={data?.type} data-id={data?.id}></div>
        </>
    )
}

export default TidalEmbed;