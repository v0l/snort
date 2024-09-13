const SoundCloudEmbed = ({ link }: { link: string }) => {
  return (
    <iframe
      width="100%"
      height="166"
      allow="autoplay"
      src={`https://w.soundcloud.com/player/?url=${link}`}
      loading="lazy"
    />
  );
};

export default SoundCloudEmbed;
