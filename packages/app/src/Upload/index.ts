import useLogin from "Hooks/useLogin";
import NostrBuild from "Upload/NostrBuild";
import VoidCat from "Upload/VoidCat";
import NostrImg from "./NostrImg";

export interface UploadResult {
  url?: string;
  error?: string;
}

export interface Uploader {
  upload: (f: File | Blob, filename: string) => Promise<UploadResult>;
}

export default function useFileUpload(): Uploader {
  const fileUploader = useLogin().preferences.fileUploader;

  switch (fileUploader) {
    case "nostr.build": {
      return {
        upload: NostrBuild,
      } as Uploader;
    }
    case "nostrimg.com": {
      return {
        upload: NostrImg,
      } as Uploader;
    }
    default: {
      return {
        upload: VoidCat,
      } as Uploader;
    }
  }
}
