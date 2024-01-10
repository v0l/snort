import "./Zap.css";

import { ParsedZap } from "@snort/system";
import { FormattedMessage } from "react-intl";

import Text from "@/Components/Text/Text";
import ProfileImage from "@/Components/User/ProfileImage";
import useLogin from "@/Hooks/useLogin";
import { unwrap } from "@/Utils";
import { formatShort } from "@/Utils/Number";

import messages from "../messages";

const Zap = ({ zap, showZapped = true }: { zap: ParsedZap; showZapped?: boolean }) => {
  const { amount, content, sender, valid, receiver } = zap;
  const pubKey = useLogin().publicKey;

  return valid && sender ? (
    <div className="card">
      <div className="flex justify-between">
        <ProfileImage pubkey={sender} showProfileCard={true} />
        {receiver !== pubKey && showZapped && <ProfileImage pubkey={unwrap(receiver)} />}
        <h3>
          <FormattedMessage {...messages.Sats} values={{ n: formatShort(amount ?? 0) }} />
        </h3>
      </div>
      {(content?.length ?? 0) > 0 && sender && (
        <Text id={zap.id} creator={sender} content={unwrap(content)} tags={[]} />
      )}
    </div>
  ) : null;
};

export default Zap;
