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
        <FormattedMessage defaultMessage="Cache" />
      </h3>
      <CacheDetails cache={UserCache} name={<FormattedMessage defaultMessage="Profiles" />} />
      <CacheDetails cache={UserRelays} name={<FormattedMessage defaultMessage="Relay Lists" />} />
      <CacheDetails cache={Notifications} name={<FormattedMessage defaultMessage="Notifications" />} />
      <CacheDetails cache={FollowsFeed} name={<FormattedMessage defaultMessage="Follows Feed" />} />
      <CacheDetails cache={Chats} name={<FormattedMessage defaultMessage="Chats" />} />
      <CacheDetails cache={RelayMetrics} name={<FormattedMessage defaultMessage="Relay Metrics" />} />
      <CacheDetails cache={PaymentsCache} name={<FormattedMessage defaultMessage="Payments" />} />
      <CacheDetails cache={InteractionCache} name={<FormattedMessage defaultMessage="Interactions" />} />
      <CacheDetails cache={GiftsCache} name={<FormattedMessage defaultMessage="Gift Wraps" />} />
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
