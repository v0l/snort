import { useState } from "react";

import Icon from "@/Components/Icons/Icon";
import Spinner from "@/Components/Icons/Spinner";
import { openFile, unwrap } from "@/Utils";
import useFileUpload from "@/Utils/Upload";

interface AvatarEditorProps {
  picture?: string;
  onPictureChange?: (newPicture: string) => void;
  privKey?: string;
}

export default function AvatarEditor({ picture, onPictureChange, privKey }: AvatarEditorProps) {
  const uploader = useFileUpload(privKey);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function uploadFile() {
    setError("");
    setLoading(true);
    try {
      const f = await openFile();
      if (f && uploader) {
        const rsp = await uploader.upload(f);
        onPictureChange?.(unwrap(rsp.url));
      }
    } catch (e) {
      if (e instanceof Error) {
        setError(`Upload failed: ${e.message}`);
      } else {
        setError(`Upload failed`);
      }
    }
    setLoading(false);
  }

  return (
    <>
      <div className="flex justify-center items-center">
        <div style={{ backgroundImage: `url(${picture})` }} className="avatar">
          <div
            className={`edit flex items-center justify-center w-full h-full bg-background cursor-pointer opacity-0 rounded-full hover:opacity-50 ${picture ? "" : "new opacity-50"}`}
            onClick={() => uploadFile().catch(console.error)}>
            {loading ? <Spinner /> : <Icon name={picture ? "edit" : "camera-plus"} />}
          </div>
        </div>
      </div>
      {error && <b className="text-error">{error}</b>}
    </>
  );
}
