import { FeedCache } from "@snort/shared";
import {
  Chats,
  FollowsFeed,
  GiftsCache,
  InteractionCache,
  Notifications,
  PaymentsCache,
  RelayMetrics,
  UserCache,
  UserRelays,
} from "@/Cache";
import AsyncButton from "@/Element/AsyncButton";
import { ReactNode, useSyncExternalStore } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";

export function CacheSettings() {
  return (
    <div className="flex flex-col g8">
      <h3>
        <FormattedMessage defaultMessage="Cache" id="DBiVK1" />
      </h3>
      <CacheDetails cache={UserCache} name={<FormattedMessage defaultMessage="Profiles" id="2zJXeA" />} />
      <CacheDetails cache={UserRelays} name={<FormattedMessage defaultMessage="Relay Lists" id="tGXF0Q" />} />
      <CacheDetails cache={Notifications} name={<FormattedMessage defaultMessage="Notifications" id="NAidKb" />} />
      <CacheDetails cache={FollowsFeed} name={<FormattedMessage defaultMessage="Follows Feed" id="uKqSN+" />} />
      <CacheDetails cache={Chats} name={<FormattedMessage defaultMessage="Chats" id="ABAQyo" />} />
      <CacheDetails cache={RelayMetrics} name={<FormattedMessage defaultMessage="Relay Metrics" id="tjpYlr" />} />
      <CacheDetails cache={PaymentsCache} name={<FormattedMessage defaultMessage="Payments" id="iYc3Ld" />} />
      <CacheDetails cache={InteractionCache} name={<FormattedMessage defaultMessage="Interactions" id="u+LyXc" />} />
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
            defaultMessage="{count} ({count2} in memory)" id="geppt8"
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
