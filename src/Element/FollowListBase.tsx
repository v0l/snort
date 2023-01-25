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
        <>
            <div className="flex mt10">
                <div className="f-grow">{title}</div>
                <div className="btn" onClick={() => followAll()}>Follow All</div>
            </div>
            {pubkeys?.map(a => <ProfilePreview pubkey={a} key={a} />)}
        </>
    )
}