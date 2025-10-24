import { EventKind } from "@snort/system";
import classNames from "classnames";
import { ReactNode, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";

import AsyncButton from "@/Components/Button/AsyncButton";
import useEventPublisher from "@/Hooks/useEventPublisher";
import { FixedTopics } from "@/Pages/onboarding/fixedTopics";
import { appendDedupe } from "@/Utils";

export default function Topics() {
  const { publisher, system } = useEventPublisher();
  const [topics, setTopics] = useState<Array<string>>([]);
  const navigate = useNavigate();

  function tab(name: string, text: ReactNode) {
    const active = topics.includes(name);
    return (
      <div
        className={classNames(
          "flex gap-2 items-center px-4 py-2 my-1 border cursor-pointer font-semibold layer-2 !rounded-full",
          "hover:drop-shadow-sm",
          {
            "!bg-white !text-black": active,
          },
        )}
        onClick={() => setTopics(s => (active ? s.filter(a => a !== name) : appendDedupe(s, [name])))}>
        {text}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-center">
      <h1>
        <FormattedMessage defaultMessage="Pick a few topics of interest" />
      </h1>
      <div className="flex gap-2 flex-wrap justify-center">
        {Object.entries(FixedTopics).map(([k, v]) => tab(k, v.text))}
      </div>
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
        <FormattedMessage defaultMessage="Next" />
      </AsyncButton>
    </div>
  );
}
