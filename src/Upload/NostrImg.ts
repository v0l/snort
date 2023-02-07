import { UploadResult } from "Upload";

export default async function NostrImg(
  file: File | Blob
): Promise<UploadResult> {
  let fd = new FormData();
  fd.append("image", file);

  let rsp = await fetch("https://nostrimg.com/api/upload", {
    body: fd,
    method: "POST",
    headers: {
      accept: "application/json",
    },
  });
  if (rsp.ok) {
    let data: UploadResponse = await rsp.json();
    if (typeof data?.imageUrl === "string" && data.success) {
      return {
        url: new URL(data.imageUrl).toString(),
      };
    }
  }
  return {
    error: "Upload failed",
  };
}

interface UploadResponse {
  fileID?: string;
  fileName?: string;
  imageUrl?: string;
  lightningDestination?: string;
  lightningPaymentLink?: string;
  message?: string;
  route?: string;
  status: number;
  success: boolean;
  url?: string;
  data?: {
    url?: string;
  };
}
