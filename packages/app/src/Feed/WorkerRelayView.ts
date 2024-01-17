import { unixNow } from "@snort/shared";
import { EventKind, NostrEvent, NostrLink, ReqFilter, RequestBuilder, TaggedNostrEvent } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useEffect, useMemo, useState } from "react";

import useLogin from "@/Hooks/useLogin";
import { Relay } from "@/system";
import { Day } from "@/Utils/Const";

export function useWorkerRelayView(id: string, filters: Array<ReqFilter>, maxWindow?: number) {
  const [events, setEvents] = useState<Array<NostrEvent>>([]);
  const [rb, setRb] = useState<RequestBuilder>();
  useRequestBuilder(rb);

  useEffect(() => {
    Relay.req([
      "REQ",
      `${id}+latest`,
      ...filters.map(f => ({
        ...f,
        until: undefined,
        since: undefined,
        limit: 1,
      })),
    ]).then(latest => {
      const rb = new RequestBuilder(id);
      filters
        .map((f, i) => ({
          ...f,
          limit: undefined,
          until: undefined,
          since: latest?.at(i)?.created_at ?? (maxWindow ? unixNow() - maxWindow : undefined),
        }))
        .forEach(f => rb.withBareFilter(f));
      setRb(rb);
    });
    Relay.req(["REQ", id, ...filters]).then(setEvents);
  }, [id, filters, maxWindow]);

  return events as Array<TaggedNostrEvent>;
}

export function useWorkerRelayViewCount(id: string, filters: Array<ReqFilter>, maxWindow?: number) {
  const [count, setCount] = useState(0);
  const [rb, setRb] = useState<RequestBuilder>();
  useRequestBuilder(rb);

  useEffect(() => {
    Relay.req([
      "REQ",
      `${id}+latest`,
      ...filters.map(f => ({
        ...f,
        until: undefined,
        since: undefined,
        limit: 1,
      })),
    ]).then(latest => {
      const rb = new RequestBuilder(id);
      filters
        .map((f, i) => ({
          ...f,
          limit: undefined,
          until: undefined,
          since: latest?.at(i)?.created_at ?? (maxWindow ? unixNow() - maxWindow : undefined),
        }))
        .forEach(f => rb.withBareFilter(f));
      setRb(rb);
    });
    Relay.count(["REQ", id, ...filters]).then(setCount);
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
  return useWorkerRelayView("follows-timeline", filter, Day * 7);
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
  return useWorkerRelayView("notifications", req, Day * 30);
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

  return useWorkerRelayView("reactions", req, undefined);
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
  return useWorkerRelayView("follows-contacts-relays", filter, undefined);
}
