import { UploadResult } from "Upload";

export default async function NostrBuild(
  file: File | Blob
): Promise<UploadResult> {
  let fd = new FormData();
  fd.append("fileToUpload", file);
  fd.append("submit", "Upload Image");

  let rsp = await fetch("https://nostr.build/api/upload/snort.php", {
    body: fd,
    method: "POST",
    headers: {
      accept: "application/json",
    },
  });
  if (rsp.ok) {
    let data = await rsp.json();
    return {
      url: new URL(data).toString(),
    };
  }
  return {
    error: "Upload failed",
  };
}
