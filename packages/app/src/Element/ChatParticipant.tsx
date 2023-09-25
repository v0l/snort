import { ChatParticipant } from "chat";
import NoteToSelf from "./NoteToSelf";
import ProfileImage from "./ProfileImage";
import useLogin from "Hooks/useLogin";

export function ChatParticipantProfile({ participant }: { participant: ChatParticipant }) {
  const { publicKey } = useLogin(s => ({ publicKey: s.publicKey }));
  if (participant.id === publicKey) {
    return <NoteToSelf className="f-grow" pubkey={participant.id} />;
  }
  return <ProfileImage pubkey={participant.id} className="f-grow" profile={participant.profile} />;
}
