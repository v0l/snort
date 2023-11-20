import Changelog from "@/../CHANGELOG.md";
import { FormattedMessage } from "react-intl";
import { useEffect, useState } from "react";
import { Markdown } from "@/Element/Event/Markdown";

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
    <>
      <h1>
        <FormattedMessage defaultMessage="About" id="g5pX+a" />
      </h1>
      Version: <b>{GIT_VERSION}</b>
      <Markdown content={changelog} tags={[]} />
    </>
  );
}
