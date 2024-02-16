const SpotifyEmbed = ({ link }: { link: string }) => {
  const convertedUrl = link.replace(/\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/, "/embed/$1/$2");

  return (
    <>
      <iframe
        // eslint-disable-next-line react/no-unknown-property
        credentialless=""
        style={{ borderRadius: 12 }}
        src={convertedUrl}
        width="100%"
        height="352"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
      <a href={link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="ext">
        {link}
      </a>
    </>
  );
};

export default SpotifyEmbed;
