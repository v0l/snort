const SpotifyEmbed = ({ link }: { link: string }) => {
  const convertedUrl = link.replace(/\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/, "/embed/$1/$2");

  return (
    <iframe
      style={{ borderRadius: 12 }}
      src={convertedUrl}
      width="100%"
      height="352"
      frameBorder="0"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"></iframe>
  );
};

export default SpotifyEmbed;
