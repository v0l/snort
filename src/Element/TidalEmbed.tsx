import { useEffect, useState } from "react";
import { TidalRegex } from "Const";

async function oembedLookup (link: string) {
    // Regex + re-construct to handle both tidal.com/type/id and tidal.com/browse/type/id links.
    const regexResult = TidalRegex.exec(link);

    if (!regexResult) {
        return undefined;
    }

    const [, productType, productId] = regexResult;
    const oembedApi = `https://oembed.stage.tidal.com/?url=https://tidal.com/browse/${productType}/${productId}`;

    const apiResponse = await fetch(oembedApi);
    const json = await apiResponse.json();

    return json.html;
}

const TidalEmbed = ({ link }: { link: string }) => {
    const [embed, setEmbed] = useState();

    useEffect(() => {
        oembedLookup(link).then(setEmbed);
    }, [link]);

    if (!embed) return <a href={link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="ext">{link}</a>;
    return <div dangerouslySetInnerHTML={{__html: embed}}></div>;
}

export default TidalEmbed;