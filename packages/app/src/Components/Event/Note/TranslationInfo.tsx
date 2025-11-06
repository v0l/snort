import { FormattedMessage } from "react-intl";

import { useNoteContext } from "@/Components/Event/Note/NoteContext";


export function TranslationInfo() {
  const { translated, toggleTranslation } = useNoteContext();
  if (translated && translated.confidence > 0.5) {
    return (
      <>
        <small
          className="select-none cursor-pointer"
          onClick={e => {
            e.stopPropagation();
            toggleTranslation();
          }}>
          <FormattedMessage defaultMessage="Translated from {lang}" values={{ lang: translated.fromLanguage }} />
        </small>
      </>
    );
  } else if (translated && !translated.skipped) {
    return (
      <small>
        <FormattedMessage defaultMessage="Translation failed" />
      </small>
    );
  }
  return null;
}
