import { RelayInfo as RI } from "@snort/system";
import { useEffect, useState, useSyncExternalStore } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";
import { Link, useParams } from "react-router-dom";

import { RelayMetrics } from "@/Cache";
import { CollapsedSection } from "@/Components/Collapsed";
import NipDescription from "@/Components/nip";
import RelayPaymentLabel from "@/Components/Relay/paid";
import RelayPermissions from "@/Components/Relay/permissions";
import { RelayFavicon } from "@/Components/Relay/RelaysMetadata";
import RelaySoftware from "@/Components/Relay/software";
import RelayStatusLabel from "@/Components/Relay/status-label";
import RelayUptime from "@/Components/Relay/uptime";
import ProfileImage from "@/Components/User/ProfileImage";
import useRelayState from "@/Feed/RelayState";
import { getRelayName, parseId } from "@/Utils";

const RelayInfo = () => {
  const params = useParams();
  const [info, setInfo] = useState<RI>();

  const conn = useRelayState(params.id ?? "");

  async function loadRelayInfo() {
    const u = new URL(params.id ?? "");
    const rsp = await fetch(`${u.protocol === "wss:" ? "https:" : "http:"}//${u.host}`, {
      headers: {
        accept: "application/nostr+json",
      },
    });
    if (rsp.ok) {
      const data = await rsp.json();
      for (const [k, v] of Object.entries(data)) {
        if (v === "unset" || v === "" || v === "~") {
          data[k] = undefined;
        }
      }
      setInfo(data);
    }
  }

  useEffect(() => {
    loadRelayInfo().catch(console.error);
  }, []);

  const stats = useSyncExternalStore(
    c => RelayMetrics.hook(c, "*"),
    () => RelayMetrics.snapshot(),
  ).find(a => a.addr === params.id);

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex justify-between">
          <div className="flex gap-4 items-center">
            <RelayFavicon url={params.id ?? ""} size={80} />
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{info?.name ?? getRelayName(params.id ?? "")}</div>
                {info && <RelayPaymentLabel info={info} />}
              </div>
              <div className="text-gray-light">{params.id}</div>
            </div>
          </div>
        </div>

        {info && (
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <div className="uppercase text-secondary font-bold text-sm">
                <FormattedMessage defaultMessage="Admin" />
              </div>
              <div>{info?.pubkey && <ProfileImage pubkey={parseId(info.pubkey)} size={30} />}</div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="uppercase text-secondary font-bold text-sm">
                <FormattedMessage defaultMessage="Contact" />
              </div>
              <div>
                {info?.contact && (
                  <a
                    href={`${info.contact.startsWith("mailto:") ? "" : "mailto:"}${info.contact}`}
                    target="_blank"
                    rel="noreferrer">
                    {info.contact.replace("mailto:", "")}
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="uppercase text-secondary font-bold text-sm">
                <FormattedMessage defaultMessage="Software" />
              </div>
              <div>{info?.software && <RelaySoftware software={info.software} />}</div>
            </div>
            {conn && (
              <>
                <div className="flex flex-col gap-2">
                  <div className="uppercase text-secondary font-bold text-sm">
                    <FormattedMessage defaultMessage="Status" />
                  </div>
                  <div>
                    <RelayStatusLabel conn={conn} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="uppercase text-secondary font-bold text-sm">
                    <FormattedMessage defaultMessage="Permissions" />
                  </div>
                  <div>
                    <RelayPermissions conn={conn} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="uppercase text-secondary font-bold text-sm">
                    <FormattedMessage defaultMessage="Uptime" />
                  </div>
                  <div>
                    <RelayUptime url={conn.address} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <hr className="border-border-color" />

        {stats && (
          <CollapsedSection
            title={
              <div className="text-xl font-semibold">
                <FormattedMessage defaultMessage="Relay Stats" />
              </div>
            }
            startClosed={false}>
            <ul className="list-disc">
              <li>
                <span className="text-gray-light">
                  <FormattedMessage defaultMessage="Total Events:" />
                </span>
                &nbsp;
                <FormattedNumber value={stats.events} />
              </li>
              <li>
                <span className="text-gray-light">
                  <FormattedMessage defaultMessage="Connection Success:" />
                </span>
                &nbsp;
                <FormattedNumber value={stats.connects} />
              </li>
              <li>
                <span className="text-gray-light">
                  <FormattedMessage defaultMessage="Connection Failed:" />
                </span>
                &nbsp;
                <FormattedNumber value={stats.disconnects} />
              </li>
              <li>
                <span className="text-gray-light">
                  <FormattedMessage defaultMessage="Average Latency:" />
                </span>
                &nbsp;
                <FormattedMessage
                  defaultMessage="{n} ms"
                  values={{
                    n: (
                      <FormattedNumber
                        maximumFractionDigits={0}
                        value={stats.latency.reduce((acc, v) => acc + v, 0) / stats.latency.length}
                      />
                    ),
                  }}
                />
              </li>
              <li>
                <span className="text-gray-light">
                  <FormattedMessage defaultMessage="Last Seen:" />
                </span>
                &nbsp;
                {new Date(stats.lastSeen).toLocaleString()}
              </li>
            </ul>
          </CollapsedSection>
        )}
        <hr className="border-border-color" />
        {info?.supported_nips && (
          <CollapsedSection
            title={
              <div className="text-xl font-semibold">
                <FormattedMessage defaultMessage="Supported NIPs" />
              </div>
            }
            startClosed={false}>
            <ul className="list-disc">
              {info.supported_nips.map(n => (
                <li key={n}>
                  <Link
                    target="_blank"
                    to={`https://github.com/nostr-protocol/nips/blob/master/${n.toString().padStart(2, "0")}.md`}>
                    <NipDescription nip={n} />
                  </Link>
                </li>
              ))}
            </ul>
          </CollapsedSection>
        )}
      </div>
    </>
  );
};

export default RelayInfo;
