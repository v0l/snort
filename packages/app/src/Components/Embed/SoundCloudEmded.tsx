const SoundCloudEmbed = ({ link }: { link: string }) => {
  return (
    <>
      <iframe
        // eslint-disable-next-line react/no-unknown-property
        credentialless=""
        width="100%"
        height="166"
        scrolling="no"
        allow="autoplay"
        src={`https://w.soundcloud.com/player/?url=${link}`}
      />
      <a href={link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="ext">
        {link}
      </a>
    </>
  );
};

export default SoundCloudEmbed;
