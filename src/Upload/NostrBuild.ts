import { UploadResult } from "Upload";

export default async function NostrBuild(
  file: File | Blob
): Promise<UploadResult> {
  const fd = new FormData();
  fd.append("fileToUpload", file);
  fd.append("submit", "Upload Image");

  const rsp = await fetch("https://nostr.build/api/upload/snort.php", {
    body: fd,
    method: "POST",
    headers: {
      accept: "application/json",
    },
  });
  if (rsp.ok) {
    const data = await rsp.json();
    return {
      url: new URL(data).toString(),
    };
  }
  return {
    error: "Upload failed",
  };
}
