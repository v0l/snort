import { LeaderBadge } from "@/Element/CommunityLeaders/LeaderBadge";
import Copy from "@/Element/Copy";
import SnortApi from "@/External/SnortApi";
import useEventPublisher from "@/Hooks/useEventPublisher";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";

export function ReferralsPage() {
  const [refCode, setRefCode] = useState("");
  const { publisher } = useEventPublisher();

  useEffect(() => {
    const api = new SnortApi(undefined, publisher);

    api.getRefCode().then(v => setRefCode(v.code));
  }, [publisher]);

  return (
    <>
      <h1>
        <FormattedMessage defaultMessage="Invite your friends" id="l3H1EK" />
      </h1>
      <p>
        <FormattedMessage
          defaultMessage="Your referral code is {code}"
          id="UxgyeY"
          values={{
            code: <span className="font-mono text-highlight select-all">{refCode}</span>,
          }}
        />
      </p>
      <p>
        <FormattedMessage
          defaultMessage="Send this link to your friends and share the magic of the nostr."
          id="Ml7+RS"
        />
      </p>
      <div className="border border-zinc-900 rounded-2xl px-3 py-2">
        <Copy text={`https://${window.location.host}?ref=${refCode}`} maxSize={Number.MAX_VALUE} />
      </div>

      <h2>
        <FormattedMessage defaultMessage="Become a leader" id="M6C/px" />
      </h2>
      <div className="flex">
        <LeaderBadge />
      </div>
      <p>
        <FormattedMessage defaultMessage="Coming soon" id="e61Jf3" />
      </p>
    </>
  );
}
