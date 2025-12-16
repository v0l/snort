import type { TaggedNostrEvent } from "@snort/system";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import classNames from "classnames";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";

import { AsyncFooterIcon } from "@/Components/Event/Note/NoteFooter/AsyncFooterIcon";
import Icon from "@/Components/Icons/Icon";
import messages from "@/Components/messages";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import usePreferences from "@/Hooks/usePreferences";
import { useNoteCreator } from "@/State/NoteCreator";

export const RepostButton = ({ ev, reposts }: { ev: TaggedNostrEvent; reposts: TaggedNostrEvent[] }) => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { publisher, system } = useEventPublisher();
  const publicKey = useLogin(s => s.publicKey);
  const confirmReposts = usePreferences(s => s.confirmReposts);
  const note = useNoteCreator(n => ({ show: n.show, replyTo: n.replyTo, update: n.update, quote: n.quote }));

  const hasReposted = () => {
    return reposts.some(a => a.pubkey === publicKey);
  };

  const repost = async () => {
    if (!hasReposted() && publisher) {
      if (!confirmReposts || window.confirm(formatMessage(messages.ConfirmRepost, { id: ev.id }))) {
        const evRepost = await publisher.repost(ev);
        system.BroadcastEvent(evRepost);
      }
    }
    if (!publisher) {
      navigate("/login");
    }
  };

  const itemClassName =
    "grid grid-cols-[2rem_auto] gap-2 px-6 py-2 text-base font-semibold bg-layer-2 light:bg-white hover:bg-layer-3 light:hover:bg-neutral-200 cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <span>
          <AsyncFooterIcon
            className={classNames(
              "flex-none min-w-[50px] md:min-w-[80px]",
              hasReposted() ? "reacted text-nostr-blue" : "hover:text-nostr-blue",
            )}
            iconName="repeat"
            title={formatMessage({ defaultMessage: "Repost", id: "JeoS4y" })}
            value={reposts.length}
          />
        </span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="bg-layer-2 rounded-lg overflow-hidden z-[9999] min-w-48"
          sideOffset={5}
          align="start">
          <DropdownMenu.Item
            className={itemClassName}
            onClick={e => {
              e.stopPropagation();
              repost();
            }}
            disabled={hasReposted()}>
            <Icon name="repeat" />
            <FormattedMessage defaultMessage="Repost" />
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={itemClassName}
            onClick={e => {
              e.stopPropagation();
              note.update(n => {
                n.reset();
                n.quote = ev;
                n.show = true;
              });
            }}>
            <Icon name="edit" />
            <FormattedMessage defaultMessage="Quote Repost" />
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
