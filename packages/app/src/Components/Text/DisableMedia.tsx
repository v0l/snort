const DisableMedia = ({ content }: { content: string }) => (
  <a href={content} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">
    {content}
  </a>
);

export default DisableMedia;
