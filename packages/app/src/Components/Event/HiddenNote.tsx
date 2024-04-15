import { useState } from "react";
import { FormattedMessage } from "react-intl";

import useLogin from "@/Hooks/useLogin";

const HiddenNote = ({ children }: { children: React.ReactNode }) => {
  const hideMutedNotes = useLogin(s => s.appData.json.preferences.hideMutedNotes);
  const [show, setShow] = useState(false);
  if (hideMutedNotes) return;

  return show ? (
    children
  ) : (
    <div className="bb p flex items-center justify-between">
      <div className="text-sm text-secondary">
        <FormattedMessage defaultMessage="This note has been muted" id="qfmMQh" />
      </div>
      <button className="btn btn-sm btn-neutral" onClick={() => setShow(true)}>
        <FormattedMessage defaultMessage="Show" id="K7AkdL" />
      </button>
    </div>
  );
};

export default HiddenNote;
