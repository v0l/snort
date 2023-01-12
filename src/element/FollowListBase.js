import useEventPublisher from "../feed/EventPublisher";
import ProfilePreview from "./ProfilePreview";

export default function FollowListBase({ pubkeys, title}) {
    const publisher = useEventPublisher();

    async function followAll() {
        let ev = await publisher.addFollow(pubkeys);
        publisher.broadcast(ev);
    }

    return (
        <>
            <div className="flex">
                <div className="f-grow">{title}</div>
                <div className="btn" onClick={() => followAll()}>Follow All</div>
            </div>
            {pubkeys?.map(a => <ProfilePreview pubkey={a} key={a} />)}
        </>
    )
}