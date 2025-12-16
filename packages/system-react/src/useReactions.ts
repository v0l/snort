import { useMemo } from "react";
import { RequestBuilder, EventKind, type NostrLink } from "@snort/system";
import { useRequestBuilder } from "./useRequestBuilder";

/**
 * Subscribe to reactions (likes, reposts, zaps) for one or more events
 * @param subId - Subscription identifier
 * @param ids - NostrLink or array of NostrLinks to fetch reactions for
 * @param others - Optional callback to add custom filters. IMPORTANT: Must be wrapped in useCallback to prevent re-subscriptions
 * @param leaveOpen - Keep subscription open after EOSE
 * @returns Array of reaction events
 * @example
 * const others = useCallback((rb: RequestBuilder) => {
 *   rb.withFilter().authors([author1, author2]);
 * }, [author1, author2]);
 * const reactions = useReactions("sub-id", eventLink, others);
 */
export function useReactions(
  subId: string,
  ids: NostrLink | Array<NostrLink>,
  others?: (rb: RequestBuilder) => void,
  leaveOpen?: boolean,
) {
  // Use stable keys for memoization to prevent unnecessary re-subscriptions
  const idsKey = useMemo(() => {
    const links = Array.isArray(ids) ? ids : [ids];
    return links
      .map(l => l.tagKey)
      .sort()
      .join(",");
  }, [ids]);

  const sub = useMemo(() => {
    const rb = new RequestBuilder(subId);
    rb.withOptions({ leaveOpen });

    const links = Array.isArray(ids) ? ids : [ids];
    if (links.length > 0) {
      const grouped = links.reduce(
        (acc, v) => {
          acc[v.type] ??= [];
          acc[v.type].push(v);
          return acc;
        },
        {} as Record<string, Array<NostrLink>>,
      );

      for (const v of Object.values(grouped)) {
        rb.withFilter().kinds([EventKind.Reaction, EventKind.Repost, EventKind.ZapReceipt]).replyToLink(v);
      }
    }
    others?.(rb);
    return rb;
  }, [idsKey, others, subId, leaveOpen]);

  return useRequestBuilder(sub);
}
