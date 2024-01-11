import { useState } from "react";
import { FormattedMessage } from "react-intl";

import messages from "../messages";

const HiddenNote = ({ children }: { children: React.ReactNode }) => {
  const [show, setShow] = useState(false);
  return show ? (
    children
  ) : (
    <div className="card note hidden-note p-0">
      <div className="header">
        <p>
          <FormattedMessage defaultMessage="This note has been muted" id="qfmMQh" />
        </p>
        <button className="btn btn-sm btn-neutral" onClick={() => setShow(true)}>
          <FormattedMessage {...messages.Show} />
        </button>
      </div>
    </div>
  );
};

export default HiddenNote;
