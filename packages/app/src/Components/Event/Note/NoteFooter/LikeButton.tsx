import { normalizeReaction } from "@snort/shared";
import { TaggedNostrEvent } from "@snort/system";
import classNames from "classnames";
import { useIntl } from "react-intl";

import { AsyncFooterIcon } from "@/Components/Event/Note/NoteFooter/AsyncFooterIcon";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";

export const LikeButton = ({
  ev,
  positiveReactions,
}: {
  ev: TaggedNostrEvent;
  positiveReactions: TaggedNostrEvent[];
}) => {
  const { formatMessage } = useIntl();
  const { publicKey } = useLogin(s => ({ publicKey: s.publicKey }));
  const { publisher, system } = useEventPublisher();

  const hasReacted = (emoji: string) => {
    return (
      positiveReactions?.some(({ pubkey, content }) => normalizeReaction(content) === emoji && pubkey === publicKey)
    );
  };

  const react = async (content: string) => {
    if (!hasReacted(content) && publisher) {
      const evLike = await publisher.react(ev, content);
      system.BroadcastEvent(evLike);
    }
  };

  const reacted = hasReacted("+");

  return (
    <AsyncFooterIcon
      className={classNames(
        "flex-none min-w-[50px] md:min-w-[80px]",
        reacted ? "reacted text-nostr-red" : "hover:text-nostr-red",
      )}
      iconName={reacted ? "heart-solid" : "heart"}
      title={formatMessage({ defaultMessage: "Like", id: "qtWLmt" })}
      value={positiveReactions.length}
      onClick={() => react("+")}
    />
  );
};
