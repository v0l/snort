import "./LinkPreview.css";
import { CSSProperties, useEffect, useState } from "react";

import Spinner from "Icons/Spinner";
import SnortApi, { LinkPreviewData } from "SnortApi";
import useImgProxy from "Hooks/useImgProxy";
import { MediaElement } from "Element/MediaElement";

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
      if (data) {
        const type = data.og_tags?.find(a => a[0].toLowerCase() === "og:type");
        const canPreviewType = type?.[1].startsWith("image") || type?.[1].startsWith("video") || false;
        if (canPreviewType || data.image) {
          setPreview(data);
          return;
        }
      }

      setPreview(null);
    })();
  }, [url]);

  if (preview === null)
    return (
      <a href={url} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">
        {url}
      </a>
    );

  function previewElement() {
    const type = preview?.og_tags?.find(a => a[0].toLowerCase() === "og:type")?.[1];
    if (type?.startsWith("video")) {
      const urlTags = ["og:video:secure_url", "og:video:url", "og:video"];
      const link = preview?.og_tags?.find(a => urlTags.includes(a[0].toLowerCase()))?.[1];
      const videoType = preview?.og_tags?.find(a => a[0].toLowerCase() === "og:video:type")?.[1] ?? "video/mp4";
      if (link) {
        return <MediaElement url={link} mime={videoType} />;
      }
    }
    if (type?.startsWith("image")) {
      const urlTags = ["og:image:secure_url", "og:image:url", "og:image"];
      const link = preview?.og_tags?.find(a => urlTags.includes(a[0].toLowerCase()))?.[1];
      const videoType = preview?.og_tags?.find(a => a[0].toLowerCase() === "og:image:type")?.[1] ?? "image/png";
      if (link) {
        return <MediaElement url={link} mime={videoType} />;
      }
    }
    if (preview?.image) {
      const backgroundImage = preview?.image ? `url(${proxy(preview?.image)})` : "";
      const style = { "--img-url": backgroundImage } as CSSProperties;
      return <div className="link-preview-image" style={style}></div>;
    }
    return null;
  }

  return (
    <div className="link-preview-container">
      {preview && (
        <a href={url} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">
          {previewElement()}
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
