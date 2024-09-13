import usePreferences from "@/Hooks/usePreferences";
import { MixCloudRegex } from "@/Utils/Const";

const MixCloudEmbed = ({ link }: { link: string }) => {
  const match = link.match(MixCloudRegex);
  if (!match) return;
  const feedPath = match[1] + "%2F" + match[2];

  const theme = usePreferences(s => s.theme);
  const lightParams = theme === "light" ? "light=1" : "light=0";
  return (
    <iframe
      title="SoundCloud player"
      width="100%"
      height="120"
      frameBorder="0"
      src={`https://www.mixcloud.com/widget/iframe/?hide_cover=1&${lightParams}&feed=%2F${feedPath}%2F`}
      loading="lazy"
    />
  );
};

export default MixCloudEmbed;
