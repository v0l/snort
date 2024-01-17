import { FeedCache } from "@snort/shared";
import { ReactNode, useEffect, useState, useSyncExternalStore } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";

import {
  Chats,
  GiftsCache,
  PaymentsCache,
  RelayMetrics,
  UserCache,
} from "@/Cache";
import AsyncButton from "@/Components/Button/AsyncButton";
import { Relay } from "@/system";

export function CacheSettings() {
  return (
    <div className="flex flex-col g8">
      <h3>
        <FormattedMessage defaultMessage="Cache" id="DBiVK1" />
      </h3>
      <RelayCacheStats />
      <CacheDetails cache={UserCache} name={<FormattedMessage defaultMessage="Profiles" id="2zJXeA" />} />
      <CacheDetails cache={Chats} name={<FormattedMessage defaultMessage="Chats" id="ABAQyo" />} />
      <CacheDetails cache={RelayMetrics} name={<FormattedMessage defaultMessage="Relay Metrics" id="tjpYlr" />} />
      <CacheDetails cache={PaymentsCache} name={<FormattedMessage defaultMessage="Payments" id="iYc3Ld" />} />
      <CacheDetails cache={GiftsCache} name={<FormattedMessage defaultMessage="Gift Wraps" id="fjAcWo" />} />
    </div>
  );
}

function CacheDetails<T>({ cache, name }: { cache: FeedCache<T>; name: ReactNode }) {
  const snapshot = useSyncExternalStore(
    c => cache.hook(c, "*"),
    () => cache.snapshot(),
  );

  return (
    <div className="flex justify-between br p bg-superdark">
      <div className="flex flex-col g4">
        {name}
        <small>
          <FormattedMessage
            defaultMessage="{count} ({count2} in memory)"
            id="geppt8"
            values={{
              count: <FormattedNumber value={cache.keysOnTable().length} />,
              count2: <FormattedNumber value={snapshot.length} />,
            }}
          />
        </small>
      </div>
      <div>
        <AsyncButton onClick={() => cache.clear()}>
          <FormattedMessage defaultMessage="Clear" id="/GCoTA" />
        </AsyncButton>
      </div>
    </div>
  );
}

function RelayCacheStats() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    Relay.summary().then(setCounts);
  }, []);

  return (
    <div className="flex justify-between br p bg-superdark">
      <div className="flex flex-col g4">
        <FormattedMessage defaultMessage="Worker Relay" id="xSoIUU" />
        {Object.entries(counts).map(([k, v]) => {
          return <small key={k}>
            <FormattedMessage
              defaultMessage="{n} kind {k} events"
              id="I97cCX"
              values={{
                n: <FormattedNumber value={v} />,
                k: k
              }}
            />
          </small>
        })}

      </div>
      <div>
        <AsyncButton onClick={() => {

        }}>
          <FormattedMessage defaultMessage="Clear" id="/GCoTA" />
        </AsyncButton>
      </div>
    </div>
  );
}
