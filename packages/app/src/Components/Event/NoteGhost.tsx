import "./Note.css";
import ProfileImage from "@/Components/User/ProfileImage";

interface NoteGhostProps {
  className?: string;
  children: React.ReactNode;
}

export default function NoteGhost(props: NoteGhostProps) {
  const className = `note card ${props.className ?? ""}`;
  return (
    <div className={className}>
      <div className="header">
        <ProfileImage pubkey="" />
      </div>
      <div className="body">{props.children}</div>
      <div className="footer"></div>
    </div>
  );
}
