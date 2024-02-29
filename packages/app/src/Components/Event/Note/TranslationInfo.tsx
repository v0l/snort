import React from "react";
import { FormattedMessage } from "react-intl";

import { NoteTranslation } from "@/Components/Event/Note/types";
import messages from "@/Components/messages";

interface TranslationInfoProps {
  translated: NoteTranslation;
  setShowTranslation: React.Dispatch<React.SetStateAction<boolean>>;
}

export function TranslationInfo({ translated, setShowTranslation }: TranslationInfoProps) {
  if (translated && translated.confidence > 0.5) {
    return (
      <>
        <span
          className="text-xs font-semibold text-gray-light select-none"
          onClick={e => {
            e.stopPropagation();
            setShowTranslation(show => !show);
          }}>
          <FormattedMessage {...messages.TranslatedFrom} values={{ lang: translated.fromLanguage }} />
        </span>
      </>
    );
  } else if (translated && !translated.skipped) {
    return (
      <p className="text-xs font-semibold text-gray-light">
        <FormattedMessage {...messages.TranslationFailed} />
      </p>
    );
  }
  return null;
}
