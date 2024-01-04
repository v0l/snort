import { Day } from "@/Const";
import AsyncButton from "@/Element/Button/AsyncButton";
import useLogin from "@/Hooks/useLogin";
import { dedupe, unixNow } from "@snort/shared";
import { RequestBuilder } from "@snort/system";
import { useMemo, useState } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";
import { FollowsRelayHealth } from "./follows-relay-health";
import ProfileImage from "@/Element/User/ProfileImage";
import useEventPublisher from "@/Hooks/useEventPublisher";
import { setFollows } from "@/Login";

const enum PruneStage {
  FetchLastPostTimestamp,
  Done,
}

export function PruneFollowList() {
  const { id, follows } = useLogin(s => ({ id: s.id, follows: s.follows }));
  const { publisher, system } = useEventPublisher();
  const uniqueFollows = dedupe(follows.item);
  const [status, setStatus] = useState<PruneStage>();
  const [progress, setProgress] = useState(0);
  const [lastPost, setLastPosts] = useState<Record<string, number>>();
  const [unfollow, setUnfollow] = useState<Array<string>>([]);

  async function fetchLastPosts() {
    setStatus(PruneStage.FetchLastPostTimestamp);
    setProgress(0);
    setLastPosts(undefined);

    const BatchSize = 10;
    const chunks = uniqueFollows.reduce(
      (acc, v, i) => {
        const batch = Math.floor(i / BatchSize).toString();
        acc[batch] ??= [];
        acc[batch].push(v);
        return acc;
      },
      {} as Record<string, Array<string>>,
    );

    const result = {} as Record<string, number>;
    const batches = Math.ceil(uniqueFollows.length / BatchSize);
    for (const [batch, pubkeys] of Object.entries(chunks)) {
      console.debug(batch, pubkeys);
      const req = new RequestBuilder(`prune-${batch}`);
      req.withOptions({
        outboxPickN: 10,
        timeout: 10_000,
      });
      pubkeys.forEach(p => req.withFilter().limit(1).kinds([0, 1, 3, 5, 6, 7, 10002]).authors([p]));
      const results = await system.Fetch(req);
      console.debug(results);
      for (const rx of results) {
        if ((result[rx.pubkey] ?? 0) < rx.created_at) {
          result[rx.pubkey] = rx.created_at;
        }
      }
      setProgress(Number(batch) / batches);
    }

    for (const pk of uniqueFollows) {
      result[pk] ??= 0;
    }
    setLastPosts(result);
    setStatus(PruneStage.Done);
  }

  const newFollowList = useMemo(() => {
    return uniqueFollows.filter(a => !unfollow.includes(a) && a.length === 64);
  }, [uniqueFollows, unfollow]);

  async function publishFollowList() {
    const newFollows = newFollowList.map(a => ["p", a]) as Array<[string, string]>;
    if (publisher) {
      const ev = await publisher.contactList(newFollows);
      await system.BroadcastEvent(ev);
      setFollows(id, newFollowList, ev.created_at * 1000);
    }
  }

  function getStatus() {
    switch (status) {
      case PruneStage.FetchLastPostTimestamp:
        return (
          <FormattedMessage
            defaultMessage="Searching for account activity ({progress})"
            id="nIchMQ"
            values={{
              progress: <FormattedNumber style="percent" value={progress} />,
            }}
          />
        );
    }
  }

  function personToggle(k: string) {
    return (
      <div className="flex gap-1">
        <input
          type="checkbox"
          onChange={e => setUnfollow(v => (e.target.checked ? dedupe([...v, k]) : v.filter(a => a !== k)))}
          checked={unfollow.includes(k)}
        />
        <FormattedMessage defaultMessage="Unfollow" id="izWS4J" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-2xl font-semibold">
        <FormattedMessage defaultMessage="Prune follow list" id="CM0k0d" />
      </div>
      <p>
        <FormattedMessage
          defaultMessage="This tool will search for the last event published by all of your follows and remove those who have not posted in 6 months"
          id="vU/Q5i"
        />
      </p>
      <div>
        <FormattedMessage
          defaultMessage="{x} follows ({y} duplicates)"
          id="iICVoL"
          values={{
            x: follows.item.length,
            y: follows.item.length - uniqueFollows.length,
          }}
        />
      </div>
      <FollowsRelayHealth withTitle={false} popularRelays={false} missingRelaysActions={k => personToggle(k)} />
      <AsyncButton onClick={fetchLastPosts}>
        <FormattedMessage defaultMessage="Compute prune list" id="bJ+wrA" />
      </AsyncButton>
      {getStatus()}
      <div className="flex flex-col gap-1">
        {lastPost &&
          Object.entries(lastPost)
            .filter(([, v]) => v <= unixNow() - 90 * Day)
            .sort(([, a], [, b]) => (a > b ? -1 : 1))
            .map(([k, v]) => {
              return (
                <div key={k} className="flex justify-between">
                  <ProfileImage pubkey={k} />
                  <div className="flex flex-col gap-1">
                    <FormattedMessage
                      defaultMessage="Last post {time}"
                      id="I1AoOu"
                      values={{
                        time: new Date(v * 1000).toLocaleDateString(),
                      }}
                    />
                    {personToggle(k)}
                  </div>
                </div>
              );
            })}
      </div>
      <div className="px-4 pb-5 pt-2 rounded-2xl bg-bg-secondary">
        <p>
          <FormattedMessage
            defaultMessage="New follow list length {length}"
            id="6559gb"
            values={{ length: newFollowList.length }}
          />
        </p>
        <AsyncButton onClick={publishFollowList}>
          <FormattedMessage defaultMessage="Save" id="jvo0vs" />
        </AsyncButton>
      </div>
    </div>
  );
}
