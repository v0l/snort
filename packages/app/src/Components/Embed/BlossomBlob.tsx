import useBlossomServers from "@/Hooks/useBlossomServers";
import { appendDedupe, dedupe, isHex, NostrPrefix, removeUndefined } from "@snort/shared";
import { type NostrLink, tryParseNostrLink } from "@snort/system";
import { randomSample } from "@/Utils";
import RevealMedia from "../Event/RevealMedia";
import Icon from "../Icons/Icon";
import { useState } from "react";
import Modal from "../Modal/Modal";
import { FormattedMessage } from "react-intl";
import ProfilePreview from "../User/ProfilePreview";
import UrlStatusCheck from "./UrlStatusCheck";

interface BlossomLink {
  hash: string;
  extension: string;
  authors?: Array<NostrLink>;
  servers?: Array<string>;
  size?: number;
}

function parseBlossomLink(link: string) {
  const url = new URL(link);
  const [hash, extension] = url.pathname.split(".");
  if (!extension) {
    throw new Error("Invalid blossom link, no extension set");
  }
  if (!isHex(hash) || hash.length !== 64) {
    throw new Error("Invalid blossom link, hash is not hex or has the wrong size");
  }

  const q = new URLSearchParams(url.search);
  const authors = removeUndefined(q.getAll("as").map(a => tryParseNostrLink(a, NostrPrefix.PublicKey)));
  const servers = q.getAll("xs").map(a => (a.startsWith("http") ? a : `https://${a}`));
  const size = Number(q.get("sz"));
  return {
    hash,
    extension,
    authors: authors.length > 0 ? authors : undefined,
    servers: servers.length > 0 ? servers : undefined,
    size: isNaN(size) ? undefined : size,
  } as BlossomLink;
}

export default function BlossomBlob({ creator, link }: { creator: string; link: string }) {
  const blob = parseBlossomLink(link);
  const servers = useBlossomServers(blob.authors);
  const [showModal, setShowModal] = useState(false);

  // convert into media element
  // random sample up to maxServers urls
  const maxServers = 10;
  const authorUrls = dedupe(Object.values(servers).flat());
  const explicitUrls = dedupe(blob.servers ?? []);

  const mapBlobUrl = (a: string) => `${a}${a.endsWith("/") ? "" : "/"}${blob.hash}.${blob.extension}`;
  const allUrls = appendDedupe(authorUrls.map(mapBlobUrl), explicitUrls.map(mapBlobUrl));
  const urls = randomSample(allUrls, maxServers);
  return (
    <div className="relative min-h-12 border">
      <RevealMedia
        creator={creator}
        src={urls[0]}
        meta={{
          fallback: urls.slice(1),
          hash: blob.hash,
          size: blob.size,
        }}
      />
      <Icon
        name="info-outline"
        className="absolute top-4 left-4 cursor-pointer opacity-50 hover:opacity-100"
        onClick={() => setShowModal(true)}
      />
      {showModal && (
        <Modal id={`blossom-modal-${blob.hash}`} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold">
              <FormattedMessage defaultMessage="Blossom Blob Debug Info" />
            </h2>

            <div className="flex flex-col gap-2">
              <div>
                <strong>
                  <FormattedMessage defaultMessage="Hash" />:
                </strong>
                <code className="ml-2 font-mono text-sm break-all">{blob.hash}</code>
              </div>

              <div>
                <strong>
                  <FormattedMessage defaultMessage="Extension" />:
                </strong>
                <code className="ml-2 font-mono text-sm">{blob.extension}</code>
              </div>

              {blob.size && (
                <div>
                  <strong>
                    <FormattedMessage defaultMessage="Size" />:
                  </strong>
                  <span className="ml-2">
                    <FormattedMessage
                      defaultMessage="{size} bytes ({kb} KB)"
                      values={{
                        size: blob.size.toLocaleString(),
                        kb: (blob.size / 1024).toFixed(2),
                      }}
                    />
                  </span>
                </div>
              )}
            </div>

            {blob.authors && blob.authors.length > 0 && (
              <div>
                <strong>
                  <FormattedMessage defaultMessage="Authors ({count})" values={{ count: blob.authors.length }} />:
                </strong>
                <div className="flex flex-col gap-2 mt-2">
                  {blob.authors.map(author => (
                    <ProfilePreview key={author.id} pubkey={author.id} actions={<></>} className="layer-2" />
                  ))}
                </div>
              </div>
            )}

            {explicitUrls.length > 0 && (
              <div>
                <strong>
                  <FormattedMessage
                    defaultMessage="Explicit Servers ({count})"
                    values={{ count: explicitUrls.length }}
                  />
                  :
                </strong>
                <ul className="list-disc">
                  {explicitUrls.map(url => (
                    <li key={url} className="text-sm break-all">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {authorUrls.length > 0 && (
              <div>
                <strong>
                  <FormattedMessage
                    defaultMessage="Author-Derived Servers ({count})"
                    values={{ count: authorUrls.length }}
                  />
                  :
                </strong>
                <ul className="list-disc max-h-48 overflow-y-auto">
                  {authorUrls.map(url => (
                    <li key={url} className="text-sm break-all">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <strong>
                <FormattedMessage
                  defaultMessage="Active URLs ({active}/{max})"
                  values={{ active: urls.length, max: maxServers }}
                />
                :
              </strong>
              <div>
                {urls.map(url => (
                  <div key={url} className="text-sm break-all flex items-center gap-2">
                    <UrlStatusCheck url={url} />
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline break-all">
                      {url}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
