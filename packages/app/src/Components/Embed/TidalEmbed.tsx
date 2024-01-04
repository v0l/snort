import { useEffect, useState } from "react";

import { TidalRegex } from "@/Utils/Const";

// Re-use dom parser across instances of TidalEmbed
const domParser = new DOMParser();

async function oembedLookup(link: string) {
  // Regex + re-construct to handle both tidal.com/type/id and tidal.com/browse/type/id links.
  const regexResult = TidalRegex.exec(link);

  if (!regexResult) {
    return Promise.reject("Not a TIDAL link.");
  }

  const [, productType, productId] = regexResult;
  const oembedApi = `https://oembed.tidal.com/?url=https://tidal.com/browse/${productType}/${productId}`;

  const apiResponse = await fetch(oembedApi);
  const json = await apiResponse.json();

  const doc = domParser.parseFromString(json.html, "text/html");
  const iframe = doc.querySelector("iframe");

  if (!iframe) {
    return Promise.reject("No iframe delivered.");
  }

  return {
    source: iframe.getAttribute("src"),
    height: json.height,
  };
}

const TidalEmbed = ({ link }: { link: string }) => {
  const [source, setSource] = useState<string>();
  const [height, setHeight] = useState<number>();
  const extraStyles = link.includes("video") ? { aspectRatio: "16 / 9" } : { height };

  useEffect(() => {
    oembedLookup(link)
      .then(data => {
        setSource(data.source || undefined);
        setHeight(data.height);
      })
      .catch(console.error);
  }, [link]);

  if (!source)
    return (
      <a href={link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="ext">
        {link}
      </a>
    );
  return <iframe src={source} style={extraStyles} width="100%" title="TIDAL Embed" frameBorder={0} />;
};

export default TidalEmbed;
