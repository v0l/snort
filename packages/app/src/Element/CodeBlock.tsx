import { useEffect } from "react";
import "highlight.js/styles/github.css";
import "./CodeBlock.css";

const CodeBlock = ({ content, language }: { content: string; language?: string }) => {
  useEffect(() => {
    const importHljs = async () => {
      const hljs = (await import("highlight.js")).default;
      hljs.highlightAll();
    };

    importHljs();
  });

  return (
    <div className={`codeblock ${language && `language-${language}`}`} dir="auto">
      <pre>
        <code className={language && `language-${language}`}>{content.trim()}</code>
      </pre>
    </div>
  );
};

export default CodeBlock;
