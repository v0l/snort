import { CachedTable } from "@snort/shared";
import { ConnectionCacheRelay } from "@snort/system";
import { WorkerRelayInterface } from "@snort/worker-relay";
import { ReactNode, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";
import { useNavigate } from "react-router-dom";

import { GiftsCache, Relay, tryUseLocalRelay, UserRelays } from "@/Cache";
import AsyncButton from "@/Components/Button/AsyncButton";
import useLogin from "@/Hooks/useLogin";
import { SnortContext } from "@snort/system-react";
import { CollapsedSection } from "@/Components/Collapsed";

export function CacheSettings() {
  const system = useContext(SnortContext);
  return (
    <div className="flex flex-col gap-2">
      <h3>
        <FormattedMessage defaultMessage="Cache" />
      </h3>
      {Relay && <RelayCacheStats />}
      <CacheDetails cache={system.config.profiles} name={<FormattedMessage defaultMessage="Profiles" />} />
      <CacheDetails cache={system.config.relays} name={<FormattedMessage defaultMessage="Relays" />} />
      <CacheDetails cache={system.config.contactLists} name={<FormattedMessage defaultMessage="Follow Lists" />} />
      <CacheDetails cache={GiftsCache} name={<FormattedMessage defaultMessage="Gift Wraps" />} />
    </div>
  );
}

function CacheDetails<T>({ cache, name }: { cache: CachedTable<T>; name: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Array<T>>(cache.snapshot());
  useEffect(() => {
    const h = () => {
      setSnapshot(cache.snapshot());
    };
    cache.on("change", h);
    return () => {
      cache.off("change", h);
    };
  }, [cache]);

  return (
    <div className="flex justify-between layer-1">
      <div className="flex flex-col gap-1">
        {name}
        <small>
          <FormattedMessage
            defaultMessage="{count} ({count2} in memory)"
            values={{
              count: <FormattedNumber value={cache.keysOnTable().length} />,
              count2: <FormattedNumber value={snapshot.length} />,
            }}
          />
        </small>
      </div>
      <div>
        <AsyncButton onClick={() => cache.clear()}>
          <FormattedMessage defaultMessage="Clear" />
        </AsyncButton>
      </div>
    </div>
  );
}

function RelayCacheStats() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [myEvents, setMyEvents] = useState<number>(0);
  const login = useLogin();
  const navigate = useNavigate();

  useEffect(() => {
    if (Relay instanceof WorkerRelayInterface) {
      Relay.summary().then(setCounts);
      if (login.publicKey) {
        Relay.count(["REQ", "my", { authors: [login.publicKey] }]).then(setMyEvents);
      }
    }
  }, []);

  function relayType() {
    if (Relay instanceof WorkerRelayInterface) {
      return <FormattedMessage defaultMessage="Browser" />;
    } else if (Relay instanceof ConnectionCacheRelay) {
      return <FormattedMessage defaultMessage="Local" />;
    }
  }

  return (
    <div className="flex justify-between gap-4 layer-1">
      <div className="grow flex flex-col gap-4">
        <div>
          <FormattedMessage
            defaultMessage="{type} Worker Relay"
            values={{
              type: relayType(),
            }}
          />
        </div>
        {myEvents > 0 && (
          <div>
            <FormattedMessage
              defaultMessage="My events: {n}"
              values={{
                n: <FormattedNumber value={myEvents} />,
              }}
            />
          </div>
        )}
        <CollapsedSection title={<FormattedMessage defaultMessage="Events Breakdown" />}>
          <table className="text-neutral-400 table-auto w-full">
            <thead>
              <tr>
                <th className="text-left">
                  <FormattedMessage defaultMessage="Kind" />
                </th>
                <th className="text-left">
                  <FormattedMessage defaultMessage="Count" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(counts)
                .sort(([, a], [, b]) => (a > b ? -1 : 1))
                .map(([k, v]) => {
                  return (
                    <tr key={k}>
                      <td>
                        <FormattedNumber value={Number(k)} />
                      </td>
                      <td>
                        <FormattedNumber value={v} />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </CollapsedSection>
      </div>
      <div className="flex flex-col gap-2">
        {Relay instanceof WorkerRelayInterface && (
          <>
            <AsyncButton
              onClick={async () => {
                if (Relay instanceof WorkerRelayInterface) {
                  await Relay.wipe();
                  window.location.reload();
                }
              }}>
              <FormattedMessage defaultMessage="Clear" />
            </AsyncButton>
            <AsyncButton
              onClick={async () => {
                const data = Relay instanceof WorkerRelayInterface ? await Relay.dump() : undefined;
                if (data) {
                  const url = URL.createObjectURL(
                    new File([data.buffer as ArrayBuffer], "snort.db", {
                      type: "application/octet-stream",
                    }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "snort.db";
                  a.click();
                }
              }}>
              <FormattedMessage defaultMessage="Dump" />
            </AsyncButton>
          </>
        )}
        <AsyncButton onClick={() => navigate("/cache-debug")}>
          <FormattedMessage defaultMessage="Debug" />
        </AsyncButton>

        {!(Relay instanceof ConnectionCacheRelay) && (
          <AsyncButton
            onClick={async () => {
              if (await tryUseLocalRelay()) {
                window.location.reload();
              } else {
                alert("No local relay found");
              }
            }}>
            <FormattedMessage defaultMessage="Use Local Relay" />
          </AsyncButton>
        )}
      </div>
    </div>
  );
}
