import { FileExtensionRegex } from "Const";
import { ProxyImg } from "Element/ProxyImg";

export default function MediaLink({ link }: { link: string }) {
  const url = new URL(link);
  const extension = FileExtensionRegex.test(url.pathname.toLowerCase()) && RegExp.$1;
  switch (extension) {
    case "gif":
    case "jpg":
    case "jpeg":
    case "jfif":
    case "png":
    case "bmp":
    case "webp": {
      return <ProxyImg key={url.toString()} src={url.toString()} />;
    }
    case "wav":
    case "mp3":
    case "ogg": {
      return <audio key={url.toString()} src={url.toString()} controls />;
    }
    case "mp4":
    case "mov":
    case "mkv":
    case "avi":
    case "m4v":
    case "webm": {
      return <video key={url.toString()} src={url.toString()} controls />;
    }
    default:
      return (
        <a
          key={url.toString()}
          href={url.toString()}
          onClick={e => e.stopPropagation()}
          target="_blank"
          rel="noreferrer"
          className="ext">
          {url.toString()}
        </a>
      );
  }
}
