const AppleMusicEmbed = ({ link }: { link: string }) => {
  const convertedUrl = link.replace("music.apple.com", "embed.music.apple.com");
  const isSongLink = /\?i=\d+$/.test(convertedUrl);

  return (
    <iframe
      allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
      frameBorder="0"
      credentialless=""
      height={isSongLink ? 175 : 450}
      style={{ width: "100%", maxWidth: 660, overflow: "hidden", background: "transparent" }}
      sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
      src={convertedUrl}></iframe>
  );
};

export default AppleMusicEmbed;
