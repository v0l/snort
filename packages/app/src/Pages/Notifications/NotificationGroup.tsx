import { unwrap } from "@snort/shared";
import { EventKind, NostrLink, parseZap, TaggedNostrEvent } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";

import Icon from "@/Components/Icons/Icon";
import ProfileImage from "@/Components/User/ProfileImage";
import { dedupe, getDisplayName } from "@/Utils";
import { formatShort } from "@/Utils/Number";

import { notificationContext } from "./notificationContext";
import { NotificationContext } from "./Notifications";

export function NotificationGroup({
  evs,
  onClick,
}: {
  evs: Array<TaggedNostrEvent>;
  onClick?: (link: NostrLink) => void;
}) {
  const { ref, inView } = useInView({ triggerOnce: true });
  const { formatMessage } = useIntl();
  const kind = evs[0].kind;
  const navigate = useNavigate();

  const zaps = useMemo(() => {
    return evs.filter(a => a.kind === EventKind.ZapReceipt).map(a => parseZap(a));
  }, [evs]);
  const pubkeys = dedupe(
    evs.map(a => {
      if (a.kind === EventKind.ZapReceipt) {
        const zap = unwrap(zaps.find(b => b.id === a.id));
        return zap.anonZap ? "anon" : zap.sender ?? a.pubkey;
      }
      return a.pubkey;
    }),
  );
  const firstPubkey = pubkeys[0];
  const firstPubkeyProfile = useUserProfile(inView ? (firstPubkey === "anon" ? "" : firstPubkey) : "");
  const context = notificationContext(evs[0]);
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
            id="kuPHYE"
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
            id="kJYo0u"
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
            id="Lw+I+J"
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
    <div className="card notification-group" ref={ref}>
      {inView && (
        <>
          <div className="flex flex-col g12">
            <div>
              <Icon name={iconName()} size={24} className={iconName()} />
            </div>
            <div>{kind === EventKind.ZapReceipt && formatShort(totalZaps)}</div>
          </div>
          <div className="flex flex-col w-max g12">
            <div className="flex">
              {pubkeys
                .filter(a => a !== "anon")
                .slice(0, 12)
                .map(v => (
                  <ProfileImage
                    key={v}
                    showUsername={kind === EventKind.TextNote}
                    pubkey={v}
                    size={40}
                    overrideUsername={v === "" ? formatMessage({ defaultMessage: "Anon", id: "bfvyfs" }) : undefined}
                  />
                ))}
            </div>
            {kind !== EventKind.TextNote && (
              <div className="names">
                {actionName(
                  pubkeys.length - 1,
                  firstPubkey === "anon"
                    ? formatMessage({ defaultMessage: "Anon", id: "bfvyfs" })
                    : getDisplayName(firstPubkeyProfile, firstPubkey),
                )}
              </div>
            )}
            {context && (
              <NotificationContext
                link={context}
                onClick={() => {
                  if (onClick) {
                    onClick(context);
                  } else {
                    navigate(`/${context.encode(CONFIG.eventLinkPrefix)}`);
                  }
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
