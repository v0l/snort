const TwitchEmbed = ({ link }: { link: string }) => {
  const channel = link.split("/").slice(-1);

  const args = `?channel=${channel}&parent=${window.location.hostname}&muted=true`;
  return (
    <>
      <iframe
        src={`https://player.twitch.tv/${args}`}
        className="w-max"
        allowFullScreen={true}
        // eslint-disable-next-line react/no-unknown-property
        credentialless=""
      />
      <a href={link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="ext">
        {link}
      </a>
    </>
  );
};

export default TwitchEmbed;
