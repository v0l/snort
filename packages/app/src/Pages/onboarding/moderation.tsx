/* eslint-disable @typescript-eslint/no-unused-vars */
import { ReactNode, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";
import AsyncButton from "Element/AsyncButton";
import classNames from "classnames";
import { appendDedupe } from "SnortUtils";
import useEventPublisher from "Hooks/useEventPublisher";
import { setMuted } from "Login";
import { ToggleSwitch } from "Icons/Toggle";

export const FixedModeration = {
  hateSpeech: {
    title: <FormattedMessage defaultMessage="Hate Speech" />,
    words: [],
    canEdit: false,
  },
  derogatory: {
    title: <FormattedMessage defaultMessage="Derogatory" />,
    words: [],
    canEdit: false,
  },
  nsfw: {
    title: <FormattedMessage defaultMessage="NSFW" />,
    words: [
      "adult content",
      "explicit",
      "mature audiences",
      "18+",
      "sensitive content",
      "graphic content",
      "age-restricted",
      "explicit material",
      "adult material",
      "nsfw",
      "explicit images",
      "adult film",
      "adult video",
      "mature themes",
      "sexual content",
      "graphic violence",
      "strong language",
      "explicit language",
      "adult-only",
      "mature language",
    ],
    canEdit: false,
  },
  crypto: {
    title: <FormattedMessage defaultMessage="Crypto" />,
    words: [
      "bitcoin",
      "btc",
      "satoshi",
      "crypto",
      "blockchain",
      "mining",
      "wallet",
      "exchange",
      "halving",
      "hash rate",
      "ledger",
      "crypto trading",
      "digital currency",
      "virtual currency",
      "cryptocurrency investment",
      "altcoin",
      "decentralized finance",
      "defi",
      "token",
      "ico",
      "crypto wallet",
      "satoshi nakamoto",
    ],
    canEdit: true,
  },
  politics: {
    title: <FormattedMessage defaultMessage="Politics" />,
    words: [],
    canEdit: true,
  },
};

export function Moderation() {
  const { publisher, system } = useEventPublisher();
  const [topics, setTopics] = useState<Array<string>>(Object.keys(FixedModeration));
  const navigate = useNavigate();

  return (
    <div className="flex flex-col g24">
      <div className="flex flex-col g8 text-center">
        <h1>
          <FormattedMessage defaultMessage="Clean up your feed" />
        </h1>
        <FormattedMessage defaultMessage="Your space the way you want it 😌" />
      </div>
      <div className="flex flex-col g8">
        <div className="flex g8 items-center">
          <small className="grow uppercase font-semibold">
            <FormattedMessage defaultMessage="Lists to mute:" />
          </small>
          <span className="font-medium">
            <FormattedMessage defaultMessage="Toggle all" />
          </span>
          <ToggleSwitch
            size={50}
            onClick={() =>
              topics.length === Object.keys(FixedModeration).length
                ? setTopics([])
                : setTopics(Object.keys(FixedModeration))
            }
            className={topics.length === Object.keys(FixedModeration).length ? "active" : ""}
          />
        </div>
        {Object.entries(FixedModeration).map(([k, v]) => (
          <div className="flex g8 items-center bb" key={k}>
            <div className="font-semibold grow">{v.title}</div>
            {v.canEdit && (
              <div>
                <FormattedMessage defaultMessage="edit" />
              </div>
            )}
            <ToggleSwitch
              size={50}
              className={topics.includes(k) ? "active" : ""}
              onClick={() => setTopics(s => (topics.includes(k) ? s.filter(a => a !== k) : appendDedupe(s, [k])))}
            />
          </div>
        ))}
      </div>
      <div className="flex flex-col g8">
        <span className="font-semibold">
          <FormattedMessage defaultMessage="Additional Terms:" />
        </span>
        <small className="font-medium">
          <FormattedMessage defaultMessage="Use commas to separate words e.g. word1, word2, word3" />
        </small>
        <textarea></textarea>
      </div>
      <AsyncButton
        className="primary"
        onClick={async () => {
          const words = Object.entries(FixedModeration)
            .filter(([k]) => topics.includes(k))
            .map(([, v]) => v.words)
            .flat();
          if (words.length > 0) {
            // no
          }
          navigate("/");
        }}>
        <FormattedMessage defaultMessage="Finish" />
      </AsyncButton>
    </div>
  );
}
