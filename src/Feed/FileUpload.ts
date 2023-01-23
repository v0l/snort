import { useSelector } from "react-redux";
import { RootState } from "State/Store";
import NostrBuildUpload from "./NostrBuildUpload";
import VoidUpload from "./VoidUpload";

export interface UploadResult {
    url?: string,
    error?: string
}

export interface Uploader {
    upload: (f: File | Blob, filename: string) => Promise<UploadResult>
}

export default function useFileUpload(): Uploader {
    const fileUploader = useSelector((s: RootState) => s.login.preferences.fileUploader);

    switch (fileUploader) {
        case "nostr.build": {
            return {
                upload: NostrBuildUpload
            } as Uploader;
        }
        default: {
            return {
                upload: VoidUpload
            } as Uploader;
        }
    }
}