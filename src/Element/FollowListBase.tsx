import useEventPublisher from "Feed/EventPublisher";
import { HexKey } from "Nostr";
import ProfilePreview from "Element/ProfilePreview";

export interface FollowListBaseProps {
    pubkeys: HexKey[],
    title?: string
}
export default function FollowListBase({ pubkeys, title }: FollowListBaseProps) {
    const publisher = useEventPublisher();

    async function followAll() {
        let ev = await publisher.addFollow(pubkeys);
        publisher.broadcast(ev);
    }

    return (
        <div className="main-content">
            <div className="flex mt10">
                <div className="f-grow">{title}</div>
                <button type="button" onClick={() => followAll()}>Follow All</button>
            </div>
            {pubkeys?.map(a => <ProfilePreview pubkey={a} key={a} />)}
        </div>
    )
}
