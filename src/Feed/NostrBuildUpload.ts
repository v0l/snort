import { UploadResult } from "./FileUpload";

export default async function NostrBuildUpload(file: File | Blob): Promise<UploadResult> {
    let fd = new FormData();
    fd.append("fileToUpload", file);
    fd.append("submit", "Upload Image");

    let rsp = await fetch("https://nostr.build/api/upload/", {
        body: fd,
        method: "POST",
        headers: {
            "content-type": "multipart/form-data",
            "accept": "application/json"
        }
    });
    if(rsp.ok) {
        let data = await rsp.json();
        console.debug(data);
        return {
            url: data.url
        }
    }
    return {
        error: "Upload failed"
    }
}