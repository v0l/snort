import { unwrap } from "@snort/shared";
import { EventKind, NostrLink, parseZap, TaggedNostrEvent } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";

import NoteTime from "@/Components/Event/Note/NoteTime";
import Icon from "@/Components/Icons/Icon";
import ProfileImage from "@/Components/User/ProfileImage";
import useWoT from "@/Hooks/useWoT";
import { dedupe, getDisplayName } from "@/Utils";
import { formatShort } from "@/Utils/Number";

import { getNotificationContext } from "./getNotificationContext";
import { NotificationContext } from "./notificationContext";
import { AvatarGroup } from "@/Components/User/AvatarGroup";
import { WarningNotice } from "@/Components/WarningNotice/WarningNotice";

export function NotificationGroup({
  evs,
  onClick,
}: {
  evs: Array<TaggedNostrEvent>;
  onClick?: (link: NostrLink) => void;
}) {
  const { ref, inView } = useInView({ triggerOnce: true });
  const { formatMessage } = useIntl();
  const wot = useWoT();
  const kind = evs[0].kind;
  const navigate = useNavigate();

  const zaps = useMemo(() => {
    return evs.filter(a => a.kind === EventKind.ZapReceipt).map(a => parseZap(a));
  }, [evs]);
  const pubkeys = dedupe(
    evs.map(a => {
      if (a.kind === EventKind.ZapReceipt) {
        const zap = unwrap(zaps.find(b => b.id === a.id));
        return zap.anonZap ? "anon" : (zap.sender ?? a.pubkey);
      }
      return a.pubkey;
    }),
  );
  const firstPubkey = pubkeys[0];
  const firstPubkeyProfile = useUserProfile(inView ? (firstPubkey === "anon" ? "" : firstPubkey) : "");
  const context = getNotificationContext(evs[0]);
  const totalZaps = zaps.reduce((acc, v) => acc + v.amount, 0);

  const iconName = () => {
    switch (kind) {
      case EventKind.Reaction:
        return "heart-solid";
      case EventKind.ZapReceipt:
        return "zap-solid";
      case EventKind.Repost:
        return "repeat";
      case EventKind.TextNote:
        return "reverse-left";
    }
    return "";
  };

  const actionName = (n: number, name: string) => {
    switch (kind) {
      case EventKind.TextNote: {
        return "";
      }
      case EventKind.Reaction: {
        return (
          <FormattedMessage
            defaultMessage="{n,plural,=0{{name} liked} other{{name} & {n} others liked}}"
            values={{
              n,
              name,
            }}
          />
        );
      }
      case EventKind.Repost: {
        return (
          <FormattedMessage
            defaultMessage="{n,plural,=0{{name} reposted} other{{name} & {n} others reposted}}"
            values={{
              n,
              name,
            }}
          />
        );
      }
      case EventKind.ZapReceipt: {
        return (
          <FormattedMessage
            defaultMessage="{n,plural,=0{{name} zapped} other{{name} & {n} others zapped}}"
            values={{
              n,
              name,
            }}
          />
        );
      }
    }
    return `${kind}'d your post`;
  };

  return (
    <div
      className="flex gap-2 py-4 pr-4 cursor-pointer w-full overflow-hidden border-b"
      ref={ref}
      onClick={() => {
        if (!context) return;
        if (onClick) {
          onClick(context);
        } else {
          navigate(`/${context.encode(CONFIG.eventLinkPrefix)}`);
        }
      }}>
      {inView && (
        <>
          <div className="flex flex-col items-center gap-2 w-[64px] min-w-[64px]">
            <Icon name={iconName()} size={24} className={iconName()} />
            <div>{kind === EventKind.ZapReceipt && formatShort(totalZaps)}</div>
          </div>
          <div className="flex flex-col gap-2 overflow-hidden break-all w-full">
            <div className="flex flex-row justify-between items-center">
              <AvatarGroup
                ids={wot.sortPubkeys(pubkeys.filter(a => a !== "anon")).slice(0, 12)}
                showUsername={kind === EventKind.TextNote}
                size={40}
              />
              <div className="text-neutral-500">
                <NoteTime from={evs[0].created_at * 1000} />
              </div>
            </div>
            {kind !== EventKind.TextNote && (
              <div className="font-bold">
                {actionName(
                  pubkeys.length - 1,
                  firstPubkey === "anon"
                    ? formatMessage({ defaultMessage: "Anon" })
                    : getDisplayName(firstPubkeyProfile, firstPubkey),
                )}
              </div>
            )}
            {window.location.search === "?debug=true" && <pre>{JSON.stringify(evs, undefined, 2)}</pre>}
            {context && <NotificationContext link={context} />}
            {!context && (
              <>
                <WarningNotice>
                  <FormattedMessage defaultMessage="Invalid notification context" />
                </WarningNotice>
                <pre>{JSON.stringify(evs[0], undefined, 2)}</pre>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
