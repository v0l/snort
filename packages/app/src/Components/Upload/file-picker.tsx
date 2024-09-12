import { NostrEvent } from "@snort/system";
import classNames from "classnames";
import { useEffect, useState } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";

import useEventPublisher from "@/Hooks/useEventPublisher";
import useImgProxy from "@/Hooks/useImgProxy";
import useLogin from "@/Hooks/useLogin";
import { useMediaServerList } from "@/Hooks/useMediaServerList";
import { findTag } from "@/Utils";
import { Nip96Uploader } from "@/Utils/Upload/Nip96";

import AsyncButton from "../Button/AsyncButton";

export function MediaServerFileList({
  onPicked,
  cols,
}: {
  onPicked: (files: Array<NostrEvent>) => void;
  cols?: number;
}) {
  const { state } = useLogin(s => ({ v: s.state.version, state: s.state }));
  const { publisher } = useEventPublisher();
  const [fileList, setFilesList] = useState<Array<NostrEvent>>([]);
  const [pickedFiles, setPickedFiles] = useState<Array<string>>([]);
  const servers = useMediaServerList();

  async function listFiles() {
    const res = [];
    if (!publisher) return;
    for (const s of servers.servers) {
      try {
        const sx = new Nip96Uploader(s, publisher);
        const files = await sx.listFiles();
        if (files?.files) {
          res.push(...files.files);
        }
      } catch (e) {
        console.error(e);
      }
    }
    setFilesList(res);
  }

  function toggleFile(ev: NostrEvent) {
    const hash = findTag(ev, "x");
    if (!hash) return;
    setPickedFiles(a => {
      if (a.includes(hash)) {
        return a.filter(a => a != hash);
      } else {
        return [...a, hash];
      }
    });
  }

  useEffect(() => {
    listFiles().catch(console.error);
  }, [servers.servers.length, state?.version]);

  return (
    <div>
      <div
        className={classNames("grid gap-4 my-2", {
          "grid-cols-2": cols === 2 || cols === undefined,
          "grid-cols-6": cols === 6,
        })}>
        {fileList.map(a => (
          <Nip96File
            key={a.id}
            file={a}
            onClick={() => toggleFile(a)}
            checked={pickedFiles.includes(findTag(a, "x") ?? "")}
          />
        ))}
      </div>
      <AsyncButton
        disabled={pickedFiles.length === 0}
        onClick={() => onPicked(fileList.filter(a => pickedFiles.includes(findTag(a, "x") ?? "")))}>
        <FormattedMessage defaultMessage="Select" />
      </AsyncButton>
    </div>
  );
}

function Nip96File({ file, checked, onClick }: { file: NostrEvent; checked: boolean; onClick: () => void }) {
  const mime = findTag(file, "m");
  const url = findTag(file, "url");
  const size = findTag(file, "size");
  const { proxy } = useImgProxy();

  function backgroundImage() {
    if (url && (mime?.startsWith("image/") || mime?.startsWith("video/"))) {
      return `url(${proxy(url, 512)})`;
    }
  }

  return (
    <div onClick={() => onClick()}>
      <div
        className="relative bg-layer-2 rounded-lg overflow-hidden aspect-square cursor-pointer hover:outline outline-highlight bg-cover bg-center m-1"
        style={{
          backgroundImage: backgroundImage(),
        }}>
        <div className="absolute w-full h-full opacity-0 bg-black hover:opacity-80 flex flex-col items-center justify-center gap-4">
          <div>{file.content.length === 0 ? <FormattedMessage defaultMessage="Untitled" /> : file.content}</div>
          <div>
            {Number(size) > 1024 * 1024 && (
              <FormattedMessage
                defaultMessage="{n}MiB"
                values={{
                  n: <FormattedNumber value={Number(size) / 1024 / 1024} />,
                }}
              />
            )}
            {Number(size) < 1024 * 1024 && (
              <FormattedMessage
                defaultMessage="{n}KiB"
                values={{
                  n: <FormattedNumber value={Number(size) / 1024} />,
                }}
              />
            )}
          </div>
          <div>{new Date(file.created_at * 1000).toLocaleString()}</div>
        </div>
        <div
          className={classNames("w-4 h-4 border border-2 rounded-full right-1 top-1 absolute", {
            "bg-zap": checked,
          })}
        />
      </div>
    </div>
  );
}
