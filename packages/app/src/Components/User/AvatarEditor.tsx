import { useState } from "react";

import Icon from "@/Components/Icons/Icon";
import Spinner from "@/Components/Icons/Spinner";
import { openFile, unwrap } from "@/Utils";
import useFileUpload from "@/Utils/Upload";
import classNames from "classnames";

interface AvatarEditorProps {
  picture?: string;
  classname?: string;
  onPictureChange?: (newPicture: string) => void;
  privKey?: string;
}

export default function AvatarEditor({ picture, onPictureChange, privKey, className }: AvatarEditorProps) {
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
        <div
          style={{ backgroundImage: `url(${picture})`, backgroundSize: "cover", backgroundPosition: "center" }}
          className={classNames("layer-2 w-40 h-40 rounded-full", className)}>
          <div
            className={`flex items-center justify-center w-full h-full cursor-pointer rounded-full ${picture ? "opacity-20 hover:opacity-90" : ""}`}
            onClick={() => uploadFile().catch(console.error)}>
            <div className="light:bg-neutral-200 p-4 rounded-full">
              {loading ? <Spinner /> : <Icon name={picture ? "edit" : "camera-plus"} />}
            </div>
          </div>
        </div>
      </div>
      {error && <b className="text-error">{error}</b>}
    </>
  );
}
