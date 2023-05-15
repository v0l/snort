import "./ZapstrEmbed.css";
import useEventFeed from "Feed/EventFeed";
import Spinner from "Icons/Spinner";
import { NostrLink } from "Util";
import { ProxyImg } from "Element/ProxyImg";
import ProfileImage from "Element/ProfileImage";

export default function ZapstrEmbed({ link }: { link: NostrLink }) {
  const ev = useEventFeed(link);

  if (!ev.data) return <Spinner />;

  const media = ev.data.tags.find(a => a[0] === "media");
  const cover = ev.data.tags.find(a => a[0] === "cover");
  const subject = ev.data.tags.find(a => a[0] === "subject");
  const refPersons = ev.data.tags.filter(a => a[0] === "p");
  return (
    <>
      <div className="flex zapstr">
        <ProxyImg src={cover?.[1] ?? ""} size={100} />
        <div className="flex f-col">
          <div>
            <h3>{subject?.[1] ?? ""}</h3>
          </div>
          <audio src={media?.[1] ?? ""} controls={true} />
        </div>
      </div>
      <div className="zapstr">
        {refPersons.map(a => (
          <ProfileImage pubkey={a[1]} subHeader={<>{a[2] ?? ""}</>} className="card" />
        ))}
      </div>
    </>
  );
}
