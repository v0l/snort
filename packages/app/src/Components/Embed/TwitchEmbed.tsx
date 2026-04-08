const TwitchEmbed = ({ link }: { link: string }) => {
  const channel = link.split("/").slice(-1)

  const args = `?channel=${channel}&parent=${window.location.hostname}&muted=true`
  return (
    <iframe
      title="Twitch Embed"
      src={`https://player.twitch.tv/${args}`}
      className="aspect-video w-full"
      allowFullScreen={true}
      loading="lazy"
    />
  )
}

export default TwitchEmbed
