import { useEffect, useState } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";
import { Link } from "react-router-dom";

import AsyncButton from "@/Components/Button/AsyncButton";
import { LeaderBadge } from "@/Components/CommunityLeaders/LeaderBadge";
import Copy from "@/Components/Copy/Copy";
import SnortApi, { RefCodeResponse } from "@/External/SnortApi";
import useEventPublisher from "@/Hooks/useEventPublisher";

export function ReferralsPage() {
  const [refCode, setRefCode] = useState<RefCodeResponse>();
  const { publisher } = useEventPublisher();
  const api = new SnortApi(undefined, publisher);

  async function loadRefCode() {
    const c = await api.getRefCode();
    setRefCode(c);
  }

  useEffect(() => {
    loadRefCode();
  }, [publisher]);

  async function applyNow() {
    await api.applyForLeader();
    await loadRefCode();
  }

  function becomeLeader() {
    return (
      <>
        <h2>
          <FormattedMessage defaultMessage="Become a leader" />
        </h2>
        <div className="flex items-center justify-between">
          <Link to="https://community.snort.social/" target="_blank">
            <button>
              <FormattedMessage defaultMessage="Learn more" />
            </button>
          </Link>

          <LeaderBadge />
        </div>
        <p>
          <AsyncButton className="primary" onClick={applyNow}>
            <FormattedMessage defaultMessage="Apply Now" />
          </AsyncButton>
        </p>
      </>
    );
  }

  function leaderPending() {
    return (
      <>
        <h2>
          <FormattedMessage defaultMessage="Become a leader" />
        </h2>
        <div className="flex items-center justify-between">
          <Link to="https://community.snort.social/" target="_blank">
            <button>
              <FormattedMessage defaultMessage="Learn more" />
            </button>
          </Link>

          <LeaderBadge />
        </div>
        <h3>
          <FormattedMessage defaultMessage="Your application is pending" />
        </h3>
      </>
    );
  }

  function leaderInfo() {
    return (
      <>
        <h2>
          <FormattedMessage defaultMessage="Leader Info" />
        </h2>
        <p>
          <FormattedMessage
            defaultMessage="You are a community leader and are earning <b>{percent}</b> of referred users subscriptions!"
            id="bF1MYT"
            values={{
              b: c => <b>{c}</b>,
              percent: <FormattedNumber style="percent" value={refCode?.revShare ?? 0} />,
            }}
          />
        </p>
        <p>
          <FormattedMessage defaultMessage="Use your invite code to earn sats!" />
        </p>
      </>
    );
  }

  return (
    <>
      <h1>
        <FormattedMessage defaultMessage="Invite your friends" />
      </h1>
      <p>
        <FormattedMessage
          defaultMessage="Your referral code is {code}"
          id="UxgyeY"
          values={{
            code: <span className="font-mono text-highlight select-all">{refCode?.code}</span>,
          }}
        />
      </p>
      <p>
        <FormattedMessage
          defaultMessage="Send this link to your friends and share the magic of the nostr."
          id="Ml7+RS"
        />
      </p>
      <div className="border rounded-2xl px-3 py-2">
        <Copy text={`https://${window.location.host}?ref=${refCode?.code}`} maxSize={Number.MAX_VALUE} />
      </div>
      {refCode?.leaderState === undefined && becomeLeader()}
      {refCode?.leaderState === "pending" && leaderPending()}
      {refCode?.leaderState === "approved" && leaderInfo()}
    </>
  );
}
