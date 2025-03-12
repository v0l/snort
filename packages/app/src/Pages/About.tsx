import { FormattedMessage } from "react-intl";

import Changelog from "@/../CHANGELOG.md?raw";
import { Markdown } from "@/Components/Event/Markdown";

export function AboutPage() {
  const version = document.querySelector("meta[name='application-name']")?.getAttribute("content");
  return (
    <div className="main-content p">
      <h1>
        <FormattedMessage defaultMessage="About" />
      </h1>
      Version: <b>{version?.split(":")?.at(1) ?? "unknown version"}</b>
      <Markdown content={Changelog} tags={[]} />
    </div>
  );
}
