import { TaggedNostrEvent } from "@snort/system";
import { Menu, MenuItem } from "@szhsin/react-menu";
import classNames from "classnames";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";

import { AsyncFooterIcon } from "@/Components/Event/Note/NoteFooter/AsyncFooterIcon";
import Icon from "@/Components/Icons/Icon";
import messages from "@/Components/messages";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import { useNoteCreator } from "@/State/NoteCreator";

export const RepostButton = ({ ev, reposts }: { ev: TaggedNostrEvent; reposts: TaggedNostrEvent[] }) => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { publisher, system } = useEventPublisher();
  const { publicKey, preferences: prefs } = useLogin(s => ({
    preferences: s.appData.item.preferences,
    publicKey: s.publicKey,
  }));
  const note = useNoteCreator(n => ({ show: n.show, replyTo: n.replyTo, update: n.update, quote: n.quote }));

  const hasReposted = () => {
    return reposts.some(a => a.pubkey === publicKey);
  };

  const repost = async () => {
    if (!hasReposted() && publisher) {
      if (!prefs.confirmReposts || window.confirm(formatMessage(messages.ConfirmRepost, { id: ev.id }))) {
        const evRepost = await publisher.repost(ev);
        system.BroadcastEvent(evRepost);
      }
    }
    if (!publisher) {
      navigate("/login");
    }
  };

  return (
    <Menu
      menuButton={
        <AsyncFooterIcon
          className={classNames(
            "flex-none min-w-[50px] md:min-w-[80px]",
            hasReposted() ? "reacted text-nostr-blue" : "hover:text-nostr-blue",
          )}
          iconName="repeat"
          title={formatMessage({ defaultMessage: "Repost", id: "JeoS4y" })}
          value={reposts.length}
        />
      }
      menuClassName="ctx-menu"
      align="start">
      <div className="close-menu-container">
        <MenuItem>
          <div className="close-menu" />
        </MenuItem>
      </div>
      <MenuItem onClick={repost} disabled={hasReposted()}>
        <Icon name="repeat" />
        <FormattedMessage defaultMessage="Repost" id="JeoS4y" />
      </MenuItem>
      <MenuItem
        onClick={() =>
          note.update(n => {
            n.reset();
            n.quote = ev;
            n.show = true;
          })
        }>
        <Icon name="edit" />
        <FormattedMessage defaultMessage="Quote Repost" id="C7642/" />
      </MenuItem>
    </Menu>
  );
};
