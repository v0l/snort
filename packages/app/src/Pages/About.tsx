import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";

import Changelog from "@/../CHANGELOG.md";
import { Markdown } from "@/Components/Event/Markdown";

export function AboutPage() {
  const [changelog, setChangelog] = useState("");

  async function getChangelog() {
    const res = await fetch(Changelog);
    const content = await res.text();
    setChangelog(content);
  }

  useEffect(() => {
    getChangelog().catch(console.error);
  }, []);

  return (
    <div className="main-content p">
      <h1>
        <FormattedMessage defaultMessage="About" id="g5pX+a" />
      </h1>
      Version: <b>{__SNORT_VERSION__}</b>
      <Markdown content={changelog} tags={[]} />
    </div>
  );
}
