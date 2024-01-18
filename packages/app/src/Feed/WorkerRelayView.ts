import { unixNow } from "@snort/shared";
import { EventKind, NostrEvent, NostrLink, ReqFilter, RequestBuilder, TaggedNostrEvent } from "@snort/system";
import { SnortContext, useRequestBuilder } from "@snort/system-react";
import { useContext, useEffect, useMemo, useState } from "react";

import useLogin from "@/Hooks/useLogin";
import { Relay } from "@/system";
import { Day } from "@/Utils/Const";

export function useWorkerRelayView(id: string, filters: Array<ReqFilter>, leaveOpen?: boolean, maxWindow?: number) {
  const [events, setEvents] = useState<Array<NostrEvent>>([]);
  const [rb, setRb] = useState<RequestBuilder>();
  const system = useContext(SnortContext);

  useEffect(() => {
    if (rb) {
      const q = system.Query(rb);
      q.uncancel();
      return () => q.cancel();
    }
  }, [rb, system]);
  useEffect(() => {
    Relay.req({
      id: `${id}+latest`,
      filters: filters.map(f => ({
        ...f,
        until: undefined,
        since: undefined,
        limit: 1,
      })),
    }).then(latest => {
      const rb = new RequestBuilder(id);
      rb.withOptions({ fillStore: false });
      filters
        .map((f, i) => ({
          ...f,
          limit: undefined,
          until: undefined,
          since: latest.result?.at(i)?.created_at ?? (maxWindow ? unixNow() - maxWindow : undefined),
        }))
        .forEach(f => rb.withBareFilter(f));
      setRb(rb);
    });
    Relay.req({ id, filters, leaveOpen }).then(res => {
      setEvents(res.result);
      if (res.port) {
        res.port.addEventListener("message", ev => {
          const evs = ev.data as Array<NostrEvent>;
          if (evs.length > 0) {
            setEvents(x => [...x, ...evs]);
          }
        });
        res.port.start();
      }
    });
    return () => {
      Relay.close(id);
    };
  }, [id, filters, maxWindow]);

  return events as Array<TaggedNostrEvent>;
}

export function useWorkerRelayViewCount(id: string, filters: Array<ReqFilter>, maxWindow?: number) {
  const [count, setCount] = useState(0);
  const [rb, setRb] = useState<RequestBuilder>();
  useRequestBuilder(rb);

  useEffect(() => {
    Relay.req({
      id: `${id}+latest`,
      filters: filters.map(f => ({
        ...f,
        until: undefined,
        since: undefined,
        limit: 1,
      })),
    }).then(latest => {
      const rb = new RequestBuilder(id);
      filters
        .map((f, i) => ({
          ...f,
          limit: undefined,
          until: undefined,
          since: latest.result?.at(i)?.created_at ?? (maxWindow ? unixNow() - maxWindow : undefined),
        }))
        .forEach(f => rb.withBareFilter(f));
      setRb(rb);
    });
    Relay.count({ id, filters }).then(setCount);
  }, [id, filters, maxWindow]);

  return count;
}

export function useFollowsTimelineView(limit = 20) {
  const follows = useLogin(s => s.follows.item);
  const kinds = [EventKind.TextNote, EventKind.Repost, EventKind.Polls];

  const filter = useMemo(() => {
    return [
      {
        authors: follows,
        kinds,
        limit,
      },
    ];
  }, [follows, limit]);
  return useWorkerRelayView("follows-timeline", filter, true, Day * 7);
}

export function useNotificationsView() {
  const publicKey = useLogin(s => s.publicKey);
  const kinds = [EventKind.TextNote, EventKind.Reaction, EventKind.Repost, EventKind.ZapReceipt];
  const req = useMemo(() => {
    return [
      {
        "#p": [publicKey ?? ""],
        kinds,
        since: unixNow() - Day * 7,
      },
    ];
  }, [publicKey]);
  return useWorkerRelayView("notifications", req, true, Day * 30);
}

export function useReactionsView(ids: Array<NostrLink>, leaveOpen = true) {
  const req = useMemo(() => {
    const rb = new RequestBuilder("reactions");
    rb.withOptions({ leaveOpen });
    const grouped = ids.reduce(
      (acc, v) => {
        acc[v.type] ??= [];
        acc[v.type].push(v);
        return acc;
      },
      {} as Record<string, Array<NostrLink>>,
    );

    for (const [, v] of Object.entries(grouped)) {
      rb.withFilter().kinds([EventKind.Reaction, EventKind.Repost, EventKind.ZapReceipt]).replyToLink(v);
    }
    return rb.buildRaw();
  }, [ids]);

  return useWorkerRelayView("reactions", req, leaveOpen, undefined);
}

export function useReactionsViewCount(ids: Array<NostrLink>, leaveOpen = true) {
  const req = useMemo(() => {
    const rb = new RequestBuilder("reactions");
    rb.withOptions({ leaveOpen });
    const grouped = ids.reduce(
      (acc, v) => {
        acc[v.type] ??= [];
        acc[v.type].push(v);
        return acc;
      },
      {} as Record<string, Array<NostrLink>>,
    );

    for (const [, v] of Object.entries(grouped)) {
      rb.withFilter().kinds([EventKind.Reaction, EventKind.Repost, EventKind.ZapReceipt]).replyToLink(v);
    }
    return rb.buildRaw();
  }, [ids]);

  return useWorkerRelayViewCount("reactions", req, undefined);
}

export function useFollowsContactListView() {
  const follows = useLogin(s => s.follows.item);
  const kinds = [EventKind.ContactList, EventKind.Relays];

  const filter = useMemo(() => {
    return [
      {
        authors: follows,
        kinds,
      },
    ];
  }, [follows]);
  return useWorkerRelayView("follows-contacts-relays", filter, undefined, undefined);
}
