import { useEffect, useState } from "react";

async function fetchUrlPreviewInfo(url: string) {
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
    <a href={url}>
      <img src={previewImage}></img>
      <p>{previewtitle}</p>
    </a>
  );
};

export default LinkPreview;
