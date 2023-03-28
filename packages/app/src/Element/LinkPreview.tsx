import { useEffect, useState } from "react";

async function fetchUrlPreviewInfo(url: string) {
  // Hardcoded the dufflepud url here only for initial testing by Snort devs,
  // will be more ideal for Snort to deploy its own instance of Dufflepud
  // and link to it in an .env to not bombard dufflepud.onrender.com , which is
  // Coracle's instance. Repo: https://github.com/staab/dufflepud
  const res = await fetch("http://dufflepud.onrender.com/link/preview", {
    method: "POST",
    body: JSON.stringify({ url }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  const json = await res.json();
  if (json.title || json.image) {
    const preview = json;
    return preview;
  } else {
    return null;
  }
}

const LinkPreview = ({ url }: { url: string }) => {
  const [previewImage, setImage] = useState<string>();
  const [previewtitle, setTitle] = useState<string>();
  useEffect(() => {
    fetchUrlPreviewInfo(url)
      .then(data => {
        if (data) {
          setImage(data.image || undefined);
          setTitle(data.title || undefined);
        }
      })
      .catch(console.error);
  }, [url]);
  return (
    <div className="link-preview-container">
      <a href={url}>
        <img src={previewImage} className="link-preview-image"></img>
        <p className="link-preview-title">{previewtitle}</p>
      </a>
    </div>
  );
};

export default LinkPreview;
