import useLogin from "@/Hooks/useLogin";
import { MixCloudRegex } from "@/Utils/Const";

const MixCloudEmbed = ({ link }: { link: string }) => {
  const feedPath = (MixCloudRegex.test(link) && RegExp.$1) + "%2F" + (MixCloudRegex.test(link) && RegExp.$2);

  const theme = useLogin(s => s.appData.item.preferences.theme);
  const lightParams = theme === "light" ? "light=1" : "light=0";
  return (
    <>
      <br />
      <iframe
        credentialless=""
        title="SoundCloud player"
        width="100%"
        height="120"
        frameBorder="0"
        src={`https://www.mixcloud.com/widget/iframe/?hide_cover=1&${lightParams}&feed=%2F${feedPath}%2F`}
      />
    </>
  );
};

export default MixCloudEmbed;
