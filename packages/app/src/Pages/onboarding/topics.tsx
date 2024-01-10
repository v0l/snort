import { EventKind } from "@snort/system";
import classNames from "classnames";
import { ReactNode, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";

import AsyncButton from "@/Components/Button/AsyncButton";
import useEventPublisher from "@/Hooks/useEventPublisher";
import { FixedTopics } from "@/Pages/onboarding/fixedTopics";
import { appendDedupe } from "@/Utils";

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
        <FormattedMessage defaultMessage="Pick a few topics of interest" id="fX5RYm" />
      </h1>
      <div className="tabs flex-wrap justify-center">{Object.entries(FixedTopics).map(([k, v]) => tab(k, v.text))}</div>
      <AsyncButton
        className="primary"
        onClick={async () => {
          const tags = Object.entries(FixedTopics)
            .filter(([k]) => topics.includes(k))
            .map(([, v]) => v.tags)
            .flat();

          if (tags.length > 0) {
            const ev = await publisher?.generic(eb => {
              eb.kind(EventKind.InterestsList);
              tags.forEach(a => eb.tag(["t", a]));
              return eb;
            });
            if (ev) {
              await system.BroadcastEvent(ev);
            }
          }
          navigate("/login/sign-up/discover");
        }}>
        <FormattedMessage defaultMessage="Next" id="9+Ddtu" />
      </AsyncButton>
    </div>
  );
}
