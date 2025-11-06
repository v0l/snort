import Icon from "@/Components/Icons/Icon";
import { EventKind, NostrEvent, NostrLink, TaggedNostrEvent } from "@snort/system";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";
import { useState } from "react";
import Modal from "@/Components/Modal/Modal";
import { FingerprintEngine, FingerprintResult } from "./ClientFingerprinting";

export function ClientTag({ ev }: { ev: TaggedNostrEvent }) {
  const info = getClientInfo(ev);

  if (!info) return;

  return (
    <>
      <span className="text-xs text-neutral-400 light:text-neutral-500">
        {info.fingerprintDetails ? <FingerprintClientTag info={info} /> : <ViaTag info={info} />}
      </span>
    </>
  );
}

function ViaTag({ info }: { info: ClientInfo }) {
  return (
    <FormattedMessage
      defaultMessage="via {client}"
      description="via {client name} tag"
      values={{
        client: (
          <span
            title={info.fingerprintDetails ? `Fingerprinted with score ${info.fingerprintDetails.score}` : undefined}
            className={info.fingerprintDetails ? "cursor-pointer" : undefined}>
            {info.link ? (
              <Link to={`/${info.link.encode()}`} onClick={e => e.stopPropagation()}>
                {info.name}
              </Link>
            ) : (
              info.name
            )}
            {info.fingerprintDetails && <Icon name="fingerprint" size={12} className="inline ml-1 mb-0.5" />}
          </span>
        ),
      }}
    />
  );
}

function FingerprintClientTag({ info }: { info: ClientInfo }) {
  const [showModal, setShowModal] = useState(false);

  if (!info.fingerprintDetails) return; //never should hit this

  return (
    <>
      <span
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          setShowModal(true);
        }}>
        <ViaTag info={info} />
      </span>
      {showModal && (
        <Modal id="fingerprint-breakdown" onClose={() => setShowModal(false)}>
          <h2 className="text-xl font-bold mb-4 flex gap-2 items-center">
            <Icon name="fingerprint" size={32} />
            <FormattedMessage defaultMessage="Client Fingerprint" />
          </h2>
          <div className="mb-4">
            <div className="font-semibold">Detected: {info.name}</div>
            <div className="text-sm text-neutral-500">
              Score: {info.fingerprintDetails.score} (minimum: {info.fingerprintDetails.minScore})
            </div>
          </div>
          <div className="space-y-4">
            {info.fingerprintDetails.allResults
              .filter(client => client.score > 0)
              .sort((a, b) => b.score - a.score)
              .map(client => (
                <div
                  key={client.clientName}
                  className={`p-3 rounded border ${client.clientName === info.name
                    ? "border-primary bg-primary/5"
                    : "border-neutral-200 dark:border-neutral-700"
                    }`}>
                  <div className="flex justify-between items-center mb-2 font-semibold text-lg">
                    <div>{client.clientName}</div>
                    <div>{client.score}</div>
                  </div>
                  <div className="">
                    {client.checks
                      .filter(check => check.passed)
                      .map(check => (
                        <div
                          key={check.id}
                          className={`text-sm leading-6 flex items-start gap-2 ${check.passed ? "text-green-600 dark:text-green-400" : "text-neutral-400"
                            }`}>
                          <span className="w-6">{check.passed ? `+${check.weight}` : ""}</span>
                          <span>{check.description}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </Modal>
      )}
    </>
  );
}

const fingerprintEngine = new FingerprintEngine();

interface ClientInfo {
  name: string;
  link?: NostrLink;
  fingerprintDetails?: FingerprintResult;
}

export function getClientInfo(ev: NostrEvent): ClientInfo | undefined {
  let tag = ev.tags.find(a => a[0] === "client");
  if (tag) {
    const link = tag[2] && tag[2].includes(":") ? NostrLink.tryFromTag(["a", tag[2]]) : undefined;
    return {
      name: tag[1],
      link,
    };
  }

  // try fingerprinting note when no client tag set
  if (!tag && ev.kind === EventKind.TextNote) {
    const result = fingerprintEngine.fingerprint(ev);
    if (result) {
      return {
        name: result.name,
        fingerprintDetails: result,
      };
    }
  }
}
