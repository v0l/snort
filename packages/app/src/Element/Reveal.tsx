import "./Reveal.css";
import Icon from "Icons/Icon";
import { useState } from "react";

interface RevealProps {
  message: React.ReactNode;
  children: React.ReactNode;
}

export default function Reveal(props: RevealProps): JSX.Element {
  const [reveal, setReveal] = useState(false);

  if (!reveal) {
    return (
      <div
        onClick={e => {
          e.stopPropagation();
          setReveal(true);
        }}
        className="note-notice flex g8">
        <Icon name="alert-circle" size={24} />
        <div>{props.message}</div>
      </div>
    );
  } else {
    return <>{props.children}</>;
  }
}
