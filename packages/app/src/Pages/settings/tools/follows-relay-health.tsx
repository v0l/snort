import { dedupe } from "@snort/shared";
import { OutboxModel } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import { ReactNode, useContext, useMemo } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";

import { CollapsedSection } from "@/Components/Collapsed";
import ProfilePreview from "@/Components/User/ProfilePreview";
import useFollowsControls from "@/Hooks/useFollowControls";
import { getRelayName } from "@/Utils";

export function FollowsRelayHealth({
  withTitle,
  popularRelays,
  missingRelaysActions,
}: {
  withTitle?: boolean;
  popularRelays?: boolean;
  missingRelaysActions?: (k: string) => ReactNode;
}) {
  const system = useContext(SnortContext);
  const { followList: follows } = useFollowsControls();
  const uniqueFollows = dedupe(follows);

  const hasRelays = useMemo(() => {
    return uniqueFollows.filter(a => (system.relayCache.getFromCache(a)?.relays.length ?? 0) > 0);
  }, [uniqueFollows]);

  const missingRelays = useMemo(() => {
    return uniqueFollows.filter(a => !hasRelays.includes(a));
  }, [hasRelays]);

  const topWriteRelays = useMemo(() => {
    const outbox = OutboxModel.fromSystem(system);
    return outbox.pickTopRelays(uniqueFollows, 1e31, "write");
  }, [uniqueFollows]);

  return (
    <div className="flex flex-col gap-4">
      {(withTitle ?? true) && (
        <div className="text-2xl font-semibold">
          <FormattedMessage defaultMessage="Follows Relay Health" />
        </div>
      )}
      <div>
        <FormattedMessage
          defaultMessage="{x}/{y} have relays ({percent})"
          id="p9Ps2l"
          values={{
            x: hasRelays.length,
            y: uniqueFollows.length,
            percent: <FormattedNumber style="percent" value={hasRelays.length / uniqueFollows.length} />,
          }}
        />
      </div>
      {missingRelays.length > 0 && (
        <CollapsedSection
          className="rounded-xl border border-border-color px-3 py-4"
          title={
            <div className="text-lg">
              <FormattedMessage defaultMessage="Missing Relays" />
            </div>
          }>
          <div>
            {missingRelays.map(a => (
              <ProfilePreview
                key={a}
                pubkey={a}
                options={{
                  about: false,
                }}
                actions={missingRelaysActions?.(a)}
              />
            ))}
          </div>
        </CollapsedSection>
      )}
      {(popularRelays ?? true) && (
        <div>
          <div className="text-xl font-medium">Popular Relays</div>
          {dedupe(topWriteRelays.flatMap(a => a.relays))
            .map(a => ({ relay: a, count: topWriteRelays.filter(b => b.relays.includes(a)).length }))
            .sort((a, b) => (a.count > b.count ? -1 : 1))
            .slice(0, 10)
            .map(a => (
              <div key={a.relay} className="flex justify-between">
                <div>{getRelayName(a.relay)}</div>
                <div>
                  {a.count} (<FormattedNumber style="percent" value={a.count / uniqueFollows.length} />)
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
