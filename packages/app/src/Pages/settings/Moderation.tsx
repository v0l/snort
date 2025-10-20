import { useState } from "react";
import { FormattedMessage } from "react-intl";

import AsyncButton from "@/Components/Button/AsyncButton";
import useModeration from "@/Hooks/useModeration";
import { useAllPreferences } from "@/Hooks/usePreferences";

export default function ModerationSettingsPage() {
  const { addMutedWord, removeMutedWord, getMutedWords } = useModeration();
  const preferences = useAllPreferences();
  const [muteWord, setMuteWord] = useState("");

  return (
    <>
      <h2>
        <FormattedMessage defaultMessage="Moderation" />
      </h2>

      <div className="py-4 flex flex-col gap-2">
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            checked={preferences.preferences.showContentWarningPosts}
            onChange={() =>
              preferences.update({
                ...preferences.preferences,
                showContentWarningPosts: !preferences.preferences.showContentWarningPosts,
              })
            }
            className="mr-2"
            id="showContentWarningPosts"
          />
          <label htmlFor="showContentWarningPosts">
            <FormattedMessage defaultMessage="Show posts that have a content warning tag" />
          </label>
        </div>
      </div>

      <h3>
        <FormattedMessage defaultMessage="Muted Words" />
      </h3>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="eg. crypto"
            className="w-max"
            value={muteWord}
            onChange={e => setMuteWord(e.target.value.toLowerCase())}
          />
          <AsyncButton
            onClick={async () => {
              await addMutedWord(muteWord);
              setMuteWord("");
            }}>
            <FormattedMessage defaultMessage="Add" />
          </AsyncButton>
        </div>
        {getMutedWords().map(v => (
          <div
            key={v}
            className="px-3 py-2 rounded-lg border border-neutral-800 light:border-neutral-200 flex items-center justify-between">
            <div>{v}</div>
            <AsyncButton onClick={() => removeMutedWord(v)}>
              <FormattedMessage defaultMessage="Delete" />
            </AsyncButton>
          </div>
        ))}
      </div>
    </>
  );
}
