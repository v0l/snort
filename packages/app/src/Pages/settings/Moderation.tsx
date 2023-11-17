import { unixNowMs } from "@snort/shared";
import useLogin from "@/Hooks/useLogin";
import { updateAppData } from "@/Login";
import { appendDedupe } from "@/SnortUtils";
import { useState } from "react";
import { FormattedMessage } from "react-intl";

export function ModerationSettings() {
  const login = useLogin();
  const [muteWord, setMuteWord] = useState("");

  function addMutedWord() {
    updateAppData(login.id, ad => ({
      item: {
        ...ad,
        mutedWords: appendDedupe(login.appData.item.mutedWords, [muteWord]),
      },
      timestamp: unixNowMs(),
    }));
    setMuteWord("");
  }

  function removeMutedWord(word: string) {
    updateAppData(login.id, ad => ({
      item: {
        ...ad,
        mutedWords: login.appData.item.mutedWords.filter(a => a !== word),
      },
      timestamp: unixNowMs(),
    }));
    setMuteWord("");
  }

  return (
    <>
      <h2>
        <FormattedMessage defaultMessage="Muted Words" />
      </h2>
      <div className="flex flex-col g12">
        <div className="flex g8">
          <input
            type="text"
            placeholder="eg. crypto"
            className="w-max"
            value={muteWord}
            onChange={e => setMuteWord(e.target.value.toLowerCase())}
          />
          <button type="button" onClick={addMutedWord}>
            <FormattedMessage defaultMessage="Add" />
          </button>
        </div>
        {login.appData.item.mutedWords.map(v => (
          <div className="p br b flex items-center justify-between">
            <div>{v}</div>
            <button type="button" onClick={() => removeMutedWord(v)}>
              <FormattedMessage defaultMessage="Delete" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
