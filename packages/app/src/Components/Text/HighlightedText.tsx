const HighlightedText = ({ content, textToHighlight }: { content: string; textToHighlight: string }) => {
  const textToHighlightArray = textToHighlight.trim().toLowerCase().split(" ");
  const re = new RegExp(`(${textToHighlightArray.join("|")})`, "gi");
  const splittedContent = content.split(re);

  const fragments = splittedContent.map((part, index) => {
    if (textToHighlightArray.includes(part.toLowerCase())) {
      return (
        <strong key={index} className="text-highlight">
          {part}
        </strong>
      );
    } else {
      return part;
    }
  });

  return <>{fragments}</>;
};

export default HighlightedText;
