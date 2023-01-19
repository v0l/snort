import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ProfilePreview from "../element/ProfilePreview";
import ZapButton from "../element/ZapButton";

const Developers = [
    "63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed", // kieran
    "7fa56f5d6962ab1e3cd424e758c3002b8665f7b0d8dcee9fe9e288d7751ac194" // verbiricha
];

const DonatePage = () => {
    return (
        <div className="m5">
            <h2>Help fund the development of Snort</h2>
            <p>
                Snort is an open source project built by passionate people in their free time
            </p>
            <p>
                Your donations are greatly appreciated
            </p>
            <p>
                Check out the code here: <a className="highlight" href="https://github.com/v0l/snort" rel="noreferrer" target="_blank">https://github.com/v0l/snort</a>
            </p>
            <h3>Developers</h3>
            {Developers.map(a => <ProfilePreview pubkey={a} key={a} actions={<ZapButton pubkey={a} />} />)}
        </div>
    );
}

export default DonatePage;
