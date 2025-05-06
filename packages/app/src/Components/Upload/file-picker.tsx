import classNames from "classnames";
import { useEffect, useState } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";

import useEventPublisher from "@/Hooks/useEventPublisher";
import useImgProxy from "@/Hooks/useImgProxy";
import useLogin from "@/Hooks/useLogin";
import { useMediaServerList } from "@/Hooks/useMediaServerList";
import { BlobDescriptor, Blossom } from "@/Utils/Upload/blossom";

import AsyncButton from "../Button/AsyncButton";

export function MediaServerFileList({
  onPicked,
  cols,
}: {
  onPicked: (files: Array<BlobDescriptor>) => void;
  cols?: number;
}) {
  const { state } = useLogin(s => ({ v: s.state.version, state: s.state }));
  const { publisher } = useEventPublisher();
  const [fileList, setFilesList] = useState<Array<BlobDescriptor>>([]);
  const [pickedFiles, setPickedFiles] = useState<Array<string>>([]);
  const servers = useMediaServerList();

  async function listFiles() {
    const res = [];
    if (!publisher) return;
    for (const s of servers.servers) {
      try {
        const sx = new Blossom(s, publisher);
        const files = await sx.list(state.pubkey);
        res.push(...files);
      } catch (e) {
        console.error(e);
      }
    }
    setFilesList(res);
  }

  function toggleFile(b: BlobDescriptor) {
    setPickedFiles(a => {
      if (a.includes(b.sha256)) {
        return a.filter(a => a != b.sha256);
      } else {
        return [...a, b.sha256];
      }
    });
  }

  useEffect(() => {
    listFiles().catch(console.error);
  }, [servers.servers.length, state?.version]);

  const finalFileList = fileList
    .sort((a, b) => (b.uploaded ?? 0) - (a.uploaded ?? 0))
    .reduce(
      (acc, v) => {
        acc[v.sha256] ??= [];
        acc[v.sha256].push(v);
        return acc;
      },
      {} as Record<string, Array<BlobDescriptor>>,
    );

  return (
    <div>
      <div
        className={classNames("grid gap-4 my-2", {
          "grid-cols-2": cols === 2 || cols === undefined,
          "grid-cols-6": cols === 6,
        })}>
        {Object.entries(finalFileList).map(([k, v]) => (
          <ServerFile key={k} file={v[0]} onClick={() => toggleFile(v[0])} checked={pickedFiles.includes(k)} />
        ))}
      </div>
      <AsyncButton
        disabled={pickedFiles.length === 0}
        onClick={() => onPicked(fileList.filter(a => pickedFiles.includes(a.sha256)))}>
        <FormattedMessage defaultMessage="Select" />
      </AsyncButton>
    </div>
  );
}

function ServerFile({ file, checked, onClick }: { file: BlobDescriptor; checked: boolean; onClick: () => void }) {
  const { proxy } = useImgProxy();

  function backgroundImage() {
    if (file.url && (file.type?.startsWith("image/") || file.type?.startsWith("video/"))) {
      return `url(${proxy(file.url, 512)})`;
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
          <div>
            {file.size > 1024 * 1024 && (
              <FormattedMessage
                defaultMessage="{n}MiB"
                values={{
                  n: <FormattedNumber value={file.size / 1024 / 1024} />,
                }}
              />
            )}
            {file.size < 1024 * 1024 && (
              <FormattedMessage
                defaultMessage="{n}KiB"
                values={{
                  n: <FormattedNumber value={file.size / 1024} />,
                }}
              />
            )}
          </div>
          <div>{file.uploaded && new Date(file.uploaded * 1000).toLocaleString()}</div>
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
