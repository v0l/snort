import * as secp from "@noble/secp256k1";
import { FileExtensionRegex, VoidCatHost } from "Const";
import { UploadResult } from "./FileUpload";

/**
 * Upload file to void.cat
 * https://void.cat/swagger/index.html
 */
export default async function VoidUpload(file: File | Blob, filename: string): Promise<UploadResult> {
    const buf = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);

    let req = await fetch(`${VoidCatHost}/upload`, {
        mode: "cors",
        method: "POST",
        body: buf,
        headers: {
            "Content-Type": "application/octet-stream",
            "V-Content-Type": file.type,
            "V-Filename": filename,
            "V-Full-Digest": secp.utils.bytesToHex(new Uint8Array(digest)),
            "V-Description": "Upload from https://snort.social",
            "V-Strip-Metadata": "true"
        }
    });

    if (req.ok) {
        let rsp: VoidUploadResponse = await req.json();
        if (rsp.ok) {
            let ext = filename.match(FileExtensionRegex);
            return {
                url: rsp.file?.meta?.url ?? `${VoidCatHost}/d/${rsp.file?.id}${ext ? `.${ext[1]}` : ""}`
            }
        } else {
            return {
                error: rsp.errorMessage
            }
        }
    }
    return {
        error: "Upload failed"
    };
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