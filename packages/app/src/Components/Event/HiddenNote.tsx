import { useState } from "react";
import { FormattedMessage } from "react-intl";

import usePreferences from "@/Hooks/usePreferences";

const HiddenNote = ({ children }: { children: React.ReactNode }) => {
  const hideMutedNotes = usePreferences(s => s.hideMutedNotes);
  const [show, setShow] = useState(false);
  if (hideMutedNotes) return;

  return show ? (
    children
  ) : (
    <div className="bb px-3 py-2 flex items-center justify-between">
      <div className="text-sm text-neutral-400">
        <FormattedMessage defaultMessage="This note has been muted" />
      </div>
      <button className="btn btn-sm btn-neutral" onClick={() => setShow(true)}>
        <FormattedMessage defaultMessage="Show" />
      </button>
    </div>
  );
};

export default HiddenNote;
