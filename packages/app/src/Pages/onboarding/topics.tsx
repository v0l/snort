import { ReactNode, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";
import AsyncButton from "Element/AsyncButton";
import classNames from "classnames";
import { appendDedupe } from "SnortUtils";
import useEventPublisher from "Hooks/useEventPublisher";
import { NostrHashtagLink } from "@snort/system";

export const FixedTopics = {
  life: {
    text: <FormattedMessage defaultMessage="Life" />,
    tags: ["life"],
  },
  science: {
    text: <FormattedMessage defaultMessage="Science" />,
    tags: ["science"],
  },
  nature: {
    text: <FormattedMessage defaultMessage="Nature" />,
    tags: ["nature"],
  },
  business: {
    text: <FormattedMessage defaultMessage="Business" />,
    tags: ["business"],
  },
  game: {
    text: <FormattedMessage defaultMessage="Game" />,
    tags: ["game", "gaming"],
  },
  sport: {
    text: <FormattedMessage defaultMessage="Sport" />,
    tags: ["sport"],
  },
  photography: {
    text: <FormattedMessage defaultMessage="Photography" />,
    tags: ["photography"],
  },
  bitcoin: {
    text: <FormattedMessage defaultMessage="Bitcoin" />,
    tags: ["bitcoin"],
  },
};

export function Topics() {
  const { publisher, system } = useEventPublisher();
  const [topics, setTopics] = useState<Array<string>>([]);
  const navigate = useNavigate();

  function tab(name: string, text: ReactNode) {
    const active = topics.includes(name);
    return (
      <div
        className={classNames("tab", { active })}
        onClick={() => setTopics(s => (active ? s.filter(a => a !== name) : appendDedupe(s, [name])))}>
        {text}
      </div>
    );
  }

  return (
    <div className="flex flex-col g24 text-center">
      <h1>
        <FormattedMessage defaultMessage="Pick a few topics of interest" />
      </h1>
      <div className="tabs flex-wrap justify-center">{Object.entries(FixedTopics).map(([k, v]) => tab(k, v.text))}</div>
      <AsyncButton
        className="primary"
        onClick={async () => {
          const tags = Object.entries(FixedTopics)
            .filter(([k]) => topics.includes(k))
            .map(([, v]) => v.tags)
            .flat()
            .map(a => new NostrHashtagLink(a));

          if (tags.length > 0) {
            const ev = await publisher?.bookmarks(tags, "follow");
            if (ev) {
              await system.BroadcastEvent(ev);
            }
          }
          navigate("/login/sign-up/discover");
        }}>
        <FormattedMessage defaultMessage="Next" />
      </AsyncButton>
    </div>
  );
}
