import { unixNowMs } from "@snort/shared";
import useLogin from "Hooks/useLogin";
import { setAppData } from "Login";
import { appendDedupe } from "SnortUtils";
import { useState } from "react";
import { FormattedMessage } from "react-intl";

export function ModerationSettings() {
  const login = useLogin();
  const [muteWord, setMuteWord] = useState("");

  function addMutedWord() {
    login.appData ??= {
      item: {
        mutedWords: [],
      },
      timestamp: 0,
    };
    setAppData(
      login,
      {
        ...login.appData.item,
        mutedWords: appendDedupe(login.appData.item.mutedWords, [muteWord]),
      },
      unixNowMs(),
    );
    setMuteWord("");
  }
  return (
    <>
      <h2>
        <FormattedMessage defaultMessage="Muted Words" />
      </h2>
      <div className="flex-column g12">
        <div className="flex g8">
          <input
            type="text"
            placeholder="eg. crypto"
            className="w-max"
            value={muteWord}
            onChange={e => setMuteWord(e.target.value)}
          />
          <button type="button" onClick={addMutedWord}>
            <FormattedMessage defaultMessage="Add" />
          </button>
        </div>
        {login.appData.item.mutedWords.map(v => (
          <div className="p br b flex f-space">
            <div>{v}</div>
            <button type="button">
              <FormattedMessage defaultMessage="Delete" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
