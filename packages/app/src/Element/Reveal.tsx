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
        className="note-invoice">
        {props.message}
      </div>
    );
  } else {
    return <>{props.children}</>;
  }
}
