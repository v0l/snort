const NostrNestsEmbed = ({ link }: { link: string }) => (
  <iframe
    title="NostrNests Embed"
    src={link}
    allow="microphone"
    width="480"
    height="680"
    style={{ maxHeight: 680 }}
  ></iframe>
)

export default NostrNestsEmbed
