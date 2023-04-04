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
  const res = await fetch(`${ApiHost}/api/v1/preview?url=${encodeURIComponent(url)}`);
  if (res.ok) {
    return (await res.json()) as LinkPreviewData;
  }
}

const LinkPreview = ({ url }: { url: string }) => {
  const [preview, setPreview] = useState<LinkPreviewData>();

  useEffect(() => {
    (async () => {
      const data = await fetchUrlPreviewInfo(url);
      if (data) {
        setPreview(data);
      }
    })().catch(console.error);
  }, [url]);

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
