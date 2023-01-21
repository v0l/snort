import { SoundCloudRegex } from "Const";
import { useSelector } from "react-redux";
import { RootState } from "State/Store";

const SoundCloudEmbed =  ({link}:  {link: string}) => {

    const feedPath = (SoundCloudRegex.test(link) && RegExp.$1) + "%2F" + ( SoundCloudRegex.test(link) && RegExp.$2)

    const lightTheme = useSelector<RootState, boolean>(s => s.login.preferences.theme === "light");

    const lightParams = lightTheme ? "light=1" : "light=0";

    return(
        <>
        <br/>
        <iframe
            title="SoundCloud player"
            width="100%"
            height="120"
            frameBorder="0"
            src={`https://www.mixcloud.com/widget/iframe/?hide_cover=1&${lightParams}&feed=%2F${feedPath}%2F`}
            />
        </>
    )
}

export default SoundCloudEmbed;
