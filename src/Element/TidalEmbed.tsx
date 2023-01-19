import { useEffect, useMemo } from "react";
import { TidalRegex } from "../Const";

const TidalEmbed = ({ link }: { link: string }) => {
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
        let sTag = document.createElement("script");
        sTag.src = ScriptSrc;
        sTag.async = true;
        document.head.appendChild(sTag);
    }, []);

    if (!data) return null;
    return <div className="tidal-embed" data-type={data.type} data-id={data.id}></div>;
}

export default TidalEmbed;