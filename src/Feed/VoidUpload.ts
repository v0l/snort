import * as secp from "@noble/secp256k1";

/**
 * Upload file to void.cat
 * https://void.cat/swagger/index.html
 */
export default async function VoidUpload(file: File | Blob, filename: string) {
    const buf = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);

    let req = await fetch(`https://void.cat/upload`, {
        mode: "cors",
        method: "POST",
        body: buf,
        headers: {
            "Content-Type": "application/octet-stream",
            "V-Content-Type": file.type,
            "V-Filename": filename,
            "V-Full-Digest": secp.utils.bytesToHex(new Uint8Array(digest)),
            "V-Description": "Upload from https://snort.social"
        }
    });

    if (req.ok) {
        let rsp: VoidUploadResponse = await req.json();
        return rsp;
    }
    return null;
}

export type VoidUploadResponse = {
    ok: boolean,
    file?: VoidFile,
    errorMessage?: string
}

export type VoidFile = {
    id: string,
    meta?: VoidFileMeta
}

export type VoidFileMeta = {
    version: number,
    id: string,
    name?: string,
    size: number,
    uploaded: Date,
    description?: string,
    mimeType?: string,
    digest?: string,
    url?: string,
    expires?: Date,
    storage?: string,
    encryptionParams?: string,
}