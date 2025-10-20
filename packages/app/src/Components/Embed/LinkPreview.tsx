import { useEffect, useState } from "react";
import { LRUCache } from "typescript-lru-cache";

import { MediaElement } from "@/Components/Embed/MediaElement";
import Spinner from "@/Components/Icons/Spinner";
import { LinkPreviewData, NostrServices } from "@/External/NostrServices";

import { ProxyImg } from "../ProxyImg";
import GenericPlayer from "./GenericPlayer";

async function fetchUrlPreviewInfo(url: string) {
  const api = new NostrServices("https://nostr-rs-api.v0l.io");
  try {
    return await api.linkPreview(url.endsWith(")") ? url.slice(0, -1) : url);
  } catch (e) {
    console.warn(`Failed to load link preview`, url);
  }
}

const cache = new LRUCache<string, LinkPreviewData>({
  maxSize: 100,
});

const LinkPreview = ({ url }: { url: string }) => {
  const [preview, setPreview] = useState<LinkPreviewData | null>(cache.get(url));

  useEffect(() => {
    (async () => {
      if (preview) return;
      const data = await fetchUrlPreviewInfo(url);
      if (data) {
        const type = data.og_tags?.find(a => a[0].toLowerCase() === "og:type");
        const canPreviewType = type?.[1].startsWith("image") || type?.[1].startsWith("video") || false;
        if (canPreviewType || data.image) {
          setPreview(data);
          cache.set(url, data);
          return;
        }
      }

      setPreview(null);
    })();
  }, [url]);

  if (preview === null)
    return (
      <a href={url} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="text-highlight">
        {url}
      </a>
    );

  function previewElement() {
    const type = preview?.og_tags?.find(a => a[0].toLowerCase() === "og:type")?.[1];
    if (type?.startsWith("video")) {
      const urlTags = ["og:video:secure_url", "og:video:url", "og:video"];
      const link = preview?.og_tags?.find(a => urlTags.includes(a[0].toLowerCase()))?.[1];
      const videoType = preview?.og_tags?.find(a => a[0].toLowerCase() === "og:video:type")?.[1] ?? "video/mp4";
      if (link && videoType.startsWith("video/")) {
        return <MediaElement url={link} mime={videoType} />;
      }
      if (link && videoType.startsWith("text/html") && preview?.image) {
        return <GenericPlayer url={link} poster={preview?.image} />;
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
      return <ProxyImg src={preview?.image} className="w-full object-cover aspect-video" />;
    }
    return null;
  }

  return (
    <div className="rounded-xl bg-neutral-900 overflow-hidden hover:cursor-pointer light:bg-neutral-200 light:border light:border-neutral-400 light:hover:shadow-md">
      {preview && (
        <a href={url} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="!no-underline">
          <div className="lg:min-h-[342px]">{previewElement()}</div>
          <div className="px-3 pb-2 leading-[21px]">
            <div className="font-bold leading-normal my-2">{preview?.title}</div>
            {preview?.description && (
              <small className="text-neutral-800 text-sm">{preview.description.slice(0, 160)}</small>
            )}
            <small className="text-xs">{new URL(url).host}</small>
          </div>
        </a>
      )}
      {!preview && <Spinner className="items-center" />}
    </div>
  );
};

export default LinkPreview;
