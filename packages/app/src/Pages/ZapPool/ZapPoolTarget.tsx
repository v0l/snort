import { useUserProfile } from "@snort/system-react";
import { FormattedMessage, FormattedNumber } from "react-intl";

import ProfilePreview from "@/Components/User/ProfilePreview";
import usePreferences from "@/Hooks/usePreferences";
import { ZapPoolController, type ZapPoolRecipient } from "@/Utils/ZapPoolController";

function ZapPoolTargetInner({ target }: { target: ZapPoolRecipient }) {
  const profile = useUserProfile(target.pubkey);
  const hasAddress = profile?.lud16 || profile?.lud06;
  const defaultZapMount = usePreferences(s => s.defaultZapAmount * (target.split / 100));
  return (
    <ProfilePreview
      pubkey={target.pubkey}
      actions={
        hasAddress ? (
          <div>
            <div>
              <FormattedNumber value={target.split} />% (
              <FormattedMessage defaultMessage="{n} sats" values={{ n: defaultZapMount }} />)
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={target.split}
              onChange={e =>
                ZapPoolController?.set({
                  ...target,
                  split: e.target.valueAsNumber,
                })
              }
            />
          </div>
        ) : (
          <FormattedMessage defaultMessage="No lightning address" />
        )
      }
    />
  );
}

export function ZapPoolTarget({ target }: { target: ZapPoolRecipient }) {
  if (!ZapPoolController) {
    return null;
  }
  return <ZapPoolTargetInner target={target} />;
}
