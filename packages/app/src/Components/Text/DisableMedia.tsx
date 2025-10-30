const DisableMedia = ({ content }: { content: string }) => (
  <a
    href={content}
    onClick={e => e.stopPropagation()}
    target="_blank"
    rel="noreferrer"
    className="text-highlight no-underline hover:underline">
    {content}
  </a>
);

export default DisableMedia;
