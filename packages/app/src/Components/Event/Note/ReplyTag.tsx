import { EventExt, type TaggedNostrEvent } from "@snort/system";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import { ClientTag } from "@/Components/Event/Note/ClientTag";
import Mention from "@/Components/Embed/Mention";

export default function ReplyTag({ ev }: { ev: TaggedNostrEvent }) {
  const thread = EventExt.extractThread(ev);
  if (thread === undefined) {
    return <ClientTag ev={ev} />;
  }
  const maxMentions = 2;
  const replyLink = thread?.replyTo ?? thread?.root;
  const link = replyLink?.encode(CONFIG.eventLinkPrefix);

  function renderMentions() {
    const elms = [];
    for (const pk of (thread?.pubKeys ?? []).slice(0, maxMentions)) {
      elms.push(<Mention link={pk} />);
      elms.push(", ");
    }
    elms.pop();
    return elms;
  }

  return (
    <small className="text-xs">
      re:&nbsp;
      {renderMentions()}
      {thread.pubKeys.length > maxMentions && (
        <>
          {" "}
          <FormattedMessage
            defaultMessage="& {n} {n, plural, =1 {other} other {others}}"
            values={{
              n: thread.pubKeys.length - maxMentions,
            }}
          />
        </>
      )}
      {thread.pubKeys.length === 0 && link && <Link to={`/${link}`}>{link.slice(0, 12)}</Link>}
      <ClientTag ev={ev} />
    </small>
  );
}
