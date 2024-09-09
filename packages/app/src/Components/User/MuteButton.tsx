import { FormattedMessage } from "react-intl";

import useModeration from "@/Hooks/useModeration";

import AsyncButton from "../Button/AsyncButton";

interface MuteButtonProps {
  pubkey: string;
}

const MuteButton = ({ pubkey }: MuteButtonProps) => {
  const { mute, unmute, isMuted } = useModeration();
  return isMuted(pubkey) ? (
    <AsyncButton className="secondary" type="button" onClick={() => unmute(pubkey)}>
      <FormattedMessage defaultMessage="Unmute" />
    </AsyncButton>
  ) : (
    <AsyncButton type="button" onClick={() => mute(pubkey)}>
      <FormattedMessage defaultMessage="Mute" />
    </AsyncButton>
  );
};

export default MuteButton;
