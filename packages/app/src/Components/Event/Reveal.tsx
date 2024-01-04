import { useState } from "react";

import { WarningNotice } from "@/Components/WarningNotice/WarningNotice";

interface RevealProps {
  message: React.ReactNode;
  children: React.ReactNode;
}

export default function Reveal(props: RevealProps) {
  const [reveal, setReveal] = useState(false);

  if (!reveal) {
    return <WarningNotice onClick={() => setReveal(true)}>{props.message}</WarningNotice>;
  } else if (props.children) {
    return props.children;
  }
}
