import { barrierQueue } from "@snort/shared";
import { NostrLink, ParsedZap, TaggedNostrEvent } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { Zapper, ZapTarget } from "@snort/wallet";
import React, { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useLongPress } from "use-long-press";

import { AsyncFooterIcon } from "@/Components/Event/Note/NoteFooter/AsyncFooterIcon";
import { ZapperQueue } from "@/Components/Event/Note/NoteFooter/ZapperQueue";
import { ZapsSummary } from "@/Components/Event/ZapsSummary";
import ZapModal from "@/Components/ZapModal/ZapModal";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import usePreferences from "@/Hooks/usePreferences";
import { getDisplayName } from "@/Utils";
import { ZapPoolController } from "@/Utils/ZapPoolController";
import { useWallet } from "@/Wallet";

export interface ZapIconProps {
  ev: TaggedNostrEvent;
  zaps: Array<ParsedZap>;
  onClickZappers?: () => void;
}

export const FooterZapButton = ({ ev, zaps, onClickZappers }: ZapIconProps) => {
  const { publicKey, readonly } = useLogin(s => ({
    publicKey: s.publicKey,
    readonly: s.readonly,
  }));
  const preferences = usePreferences(s => ({ autoZap: s.autoZap, defaultZapAmount: s.defaultZapAmount }));
  const walletState = useWallet();
  const wallet = walletState.wallet;
  const link = NostrLink.fromEvent(ev);
  const zapTotal = zaps.reduce((acc, z) => acc + z.amount, 0);
  const didZap = zaps.some(a => a.sender === publicKey);
  const [showZapModal, setShowZapModal] = useState(false);
  const { formatMessage } = useIntl();
  const [zapping, setZapping] = useState(false);
  const { publisher, system } = useEventPublisher();
  const author = useUserProfile(ev.pubkey);
  const isMine = ev.pubkey === publicKey;

  const longPress = useLongPress(() => setShowZapModal(true), { captureEvent: true });

  const getZapTarget = (): Array<ZapTarget> | undefined => {
    if (ev.tags.some(v => v[0] === "zap")) {
      return Zapper.fromEvent(ev);
    }

    const authorTarget = author?.lud16 || author?.lud06;
    if (authorTarget) {
      return [
        {
          type: "lnurl",
          value: authorTarget,
          weight: 1,
          name: getDisplayName(author, ev.pubkey),
          zap: {
            pubkey: ev.pubkey,
            event: link,
          },
        } as ZapTarget,
      ];
    }
  };

  const fastZap = async (e: React.MouseEvent) => {
    if (zapping || e?.isPropagationStopped()) return;

    const lnurl = getZapTarget();
    if (canFastZap && lnurl) {
      setZapping(true);
      try {
        await fastZapInner(lnurl, preferences.defaultZapAmount);
      } catch (e) {
        console.warn("Fast zap failed", e);
        if (!(e instanceof Error) || e.message !== "User rejected") {
          setShowZapModal(true);
        }
      } finally {
        setZapping(false);
      }
    } else {
      setShowZapModal(true);
    }
  };

  async function fastZapInner(targets: Array<ZapTarget>, amount: number) {
    if (wallet) {
      // only allow 1 invoice req/payment at a time to avoid hitting rate limits
      await barrierQueue(ZapperQueue, async () => {
        const zapper = new Zapper(system, publisher);
        const result = await zapper.send(wallet, targets, amount);
        const totalSent = result.reduce((acc, v) => (acc += v.sent), 0);
        if (totalSent > 0) {
          if (CONFIG.features.zapPool) {
            ZapPoolController?.allocate(totalSent);
          }
        }
      });
    }
  }

  const canFastZap = wallet?.isReady() && !readonly;

  const targets = getZapTarget();

  useEffect(() => {
    if (preferences.autoZap && !didZap && !isMine && !zapping) {
      const lnurl = getZapTarget();
      if (wallet?.isReady() && lnurl) {
        setZapping(true);
        queueMicrotask(async () => {
          try {
            await fastZapInner(lnurl, preferences.defaultZapAmount);
          } catch {
            // ignored
          } finally {
            setZapping(false);
          }
        });
      }
    }
  }, [preferences.autoZap, author, zapping]);

  return (
    <>
      {targets && (
        <>
          <div className="flex flex-row flex-none min-w-[50px] md:min-w-[80px] gap-4 items-center">
            <AsyncFooterIcon
              className={didZap ? "reacted text-nostr-orange" : "hover:text-nostr-orange"}
              {...longPress()}
              title={formatMessage({ defaultMessage: "Zap", id: "fBI91o" })}
              iconName={canFastZap ? "zapFast" : "zap"}
              value={zapTotal}
              onClick={fastZap}
            />
            <ZapsSummary zaps={zaps} onClick={onClickZappers ?? (() => {})} />
          </div>
          {showZapModal && (
            <ZapModal targets={getZapTarget()} onClose={() => setShowZapModal(false)} show={true} allocatePool={true} />
          )}
        </>
      )}
    </>
  );
};
