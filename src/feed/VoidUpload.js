import * as secp from "@noble/secp256k1";

/**
 * Upload file to void.cat
 * https://void.cat/swagger/index.html
 * @param {File|Blob} file 
 * @returns 
 */
export default async function VoidUpload(file) {
    const buf = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);

    let req = await fetch(`https://void.cat/upload`, {
        mode: "cors",
        method: "POST",
        body: buf,
        headers: {
            "Content-Type": "application/octet-stream",
            "V-Content-Type": file.type,
            "V-Filename": file.name,
            "V-Full-Digest": secp.utils.bytesToHex(Uint8Array.from(digest))
        }
    });

    if (req.ok) {
        let rsp = await req.json();
        if (rsp.ok) {
            return rsp.file;
        } else {
            throw rsp.errorMessage;
        }
    }
    return null;
}