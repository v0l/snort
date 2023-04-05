import { useEffect, useState } from "react";

import { ApiHost } from "Const";
import Spinner from "Icons/Spinner";
import { ProxyImg } from "Element/ProxyImg";

interface LinkPreviewData {
  title?: string;
  description?: string;
  image?: string;
}

async function fetchUrlPreviewInfo(url: string) {
  try {
    const res = await fetch(`${ApiHost}/api/v1/preview?url=${encodeURIComponent(url)}`);
    if (res.ok) {
      return (await res.json()) as LinkPreviewData;
    }
  } catch (e) {
    console.warn(`Failed to load link preview`, url);
  }
}

const LinkPreview = ({ url }: { url: string }) => {
  const [preview, setPreview] = useState<LinkPreviewData | null>();

  useEffect(() => {
    (async () => {
      const data = await fetchUrlPreviewInfo(url);
      if (data && data.title) {
        setPreview(data);
      } else {
        setPreview(null);
      }
    })();
  }, [url]);

  if (preview === null) return null;

  return (
    <div className="link-preview-container">
      {preview && (
        <a href={url} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">
          {preview?.image && <ProxyImg src={preview?.image} className="link-preview-image" />}
          <p className="link-preview-title">
            {preview?.title}
            {preview?.description && (
              <>
                <br />
                <small>{preview?.description}</small>
              </>
            )}
          </p>
        </a>
      )}
      {!preview && <Spinner className="f-center" />}
    </div>
  );
};

export default LinkPreview;
