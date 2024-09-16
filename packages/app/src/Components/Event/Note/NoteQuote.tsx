import { dedupe, sanitizeRelayUrl } from "@snort/shared";
import { NostrLink, NostrPrefix } from "@snort/system";
import { useEventFeed } from "@snort/system-react";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import AsyncButton from "@/Components/Button/AsyncButton";
import Copy from "@/Components/Copy/Copy";
import Note from "@/Components/Event/EventComponent";
import Spinner from "@/Components/Icons/Spinner";

const options = {
  showFooter: false,
  truncate: true,
};

export default function NoteQuote({ link, depth }: { link: NostrLink; depth?: number }) {
  const [tryLink, setLink] = useState<NostrLink>(link);
  const [tryRelay, setTryRelay] = useState("");
  const { formatMessage } = useIntl();

  const ev = useEventFeed(tryLink);
  if (!ev)
    return (
      <div className="note-quote flex flex-col gap-2">
        <Spinner />
        <div>
          <FormattedMessage
            defaultMessage="Looking for: {noteId}"
            values={{
              noteId: <Copy text={tryLink.encode()} />,
            }}
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tryRelay}
            onChange={e => setTryRelay(e.target.value)}
            placeholder={formatMessage({ defaultMessage: "Try another relay" })}
          />
          <AsyncButton
            onClick={() => {
              const u = sanitizeRelayUrl(tryRelay);
              if (u) {
                const relays = tryLink.relays ?? [];
                relays.push(u);
                setLink(
                  new NostrLink(
                    tryLink.type !== NostrPrefix.Address ? NostrPrefix.Event : NostrPrefix.Address,
                    tryLink.id,
                    tryLink.kind,
                    tryLink.author,
                    dedupe(relays),
                    tryLink.marker,
                  ),
                );
                setTryRelay("");
              }
            }}>
            <FormattedMessage defaultMessage="Add" />
          </AsyncButton>
        </div>
      </div>
    );
  return <Note data={ev} className="note-quote" depth={(depth ?? 0) + 1} options={options} />;
}
