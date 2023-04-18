import "./LinkPreview.css";
import { CSSProperties, useEffect, useState } from "react";

import Spinner from "Icons/Spinner";
import SnortApi, { LinkPreviewData } from "SnortApi";
import useImgProxy from "Hooks/useImgProxy";

async function fetchUrlPreviewInfo(url: string) {
  const api = new SnortApi();
  try {
    return await api.linkPreview(url);
  } catch (e) {
    console.warn(`Failed to load link preview`, url);
  }
}

const LinkPreview = ({ url }: { url: string }) => {
  const [preview, setPreview] = useState<LinkPreviewData | null>();
  const { proxy } = useImgProxy();

  useEffect(() => {
    (async () => {
      const data = await fetchUrlPreviewInfo(url);
      if (data && data.image) {
        setPreview(data);
      } else {
        setPreview(null);
      }
    })();
  }, [url]);

  if (preview === null)
    return (
      <a href={url} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">
        {url}
      </a>
    );

  const backgroundImage = preview?.image ? `url(${proxy(preview?.image)})` : "";
  const style = { "--img-url": backgroundImage } as CSSProperties;

  return (
    <div className="link-preview-container">
      {preview && (
        <a href={url} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">
          {preview?.image && <div className="link-preview-image" style={style} />}
          <p className="link-preview-title">
            {preview?.title}
            {preview?.description && (
              <>
                <br />
                <small>{preview.description.slice(0, 160)}</small>
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
