import type { TaggedNostrEvent } from "@snort/system";
import classNames from "classnames";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";

import { AsyncFooterIcon } from "@/Components/Event/Note/NoteFooter/AsyncFooterIcon";
import useLogin from "@/Hooks/useLogin";
import { useNoteCreator } from "@/State/NoteCreator";

export const ReplyButton = ({
  ev,
  replyCount,
  readonly,
}: {
  ev: TaggedNostrEvent;
  replyCount?: number;
  readonly: boolean;
}) => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const publicKey = useLogin(s => s.publicKey);
  const note = useNoteCreator(n => ({
    show: n.show,
    replyTo: n.replyTo,
    update: n.update,
    quote: n.quote,
  }));

  const handleReplyButtonClick = () => {
    if (!publicKey) {
      navigate("/login");
      return;
    }
    if (readonly) {
      return;
    }
    note.update(v => {
      if (v.replyTo?.id !== ev.id) {
        v.reset();
      }
      v.show = true;
      v.replyTo = ev;
    });
  };

  return (
    <AsyncFooterIcon
      className={classNames(
        "flex-none min-w-[50px] md:min-w-[80px]",
        note.show ? "reacted text-nostr-purple" : "hover:text-nostr-purple",
      )}
      iconName="reply"
      title={formatMessage({ defaultMessage: "Reply", id: "9HU8vw" })}
      value={replyCount ?? 0}
      onClick={handleReplyButtonClick}
    />
  );
};
