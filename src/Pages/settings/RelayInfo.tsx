import ProfilePreview from "Element/ProfilePreview";
import useRelayState from "Feed/RelayState";
import { System } from "Nostr/System";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { removeRelay } from "State/Login";
import { parseId } from "Util";

const RelayInfo = () => {
    const params = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const conn = Array.from(System.Sockets.values()).find(a => a.Id === params.id);
    console.debug(conn);
    const stats = useRelayState(conn?.Address ?? "");

    return (
        <>
            <h3 className="pointer" onClick={() => navigate("/settings/relays")}>Relays</h3>
            <div className="card">
                <h3>{stats?.info?.name}</h3>
                <p>{stats?.info?.description}</p>

                {stats?.info?.pubkey && (<>
                    <h4>Owner</h4>
                    <ProfilePreview pubkey={parseId(stats.info.pubkey)} />
                </>)}
                {stats?.info?.software && (<div className="flex">
                    <h4 className="f-grow">Software</h4>
                    <div className="flex f-col">
                        {stats.info.software.startsWith("http") ? <a href={stats.info.software} target="_blank" rel="noreferrer">{stats.info.software}</a> : <>{stats.info.software}</>}
                        <small>{!stats.info.version?.startsWith("v") && "v"}{stats.info.version}</small>
                    </div>
                </div>)}
                {stats?.info?.contact && (<div className="flex">
                    <h4 className="f-grow">Contact</h4>
                    <a href={`${stats.info.contact.startsWith("mailto:") ? "" : "mailto:"}${stats.info.contact}`} target="_blank" rel="noreferrer">{stats.info.contact}</a>
                </div>)}
                {stats?.info?.supported_nips && (<>
                    <h4>Supports</h4>
                    <div className="f-grow">
                        {stats.info.supported_nips.map(a => <span className="pill" onClick={() => navigate(`https://github.com/nostr-protocol/nips/blob/master/${a.toString().padStart(2, "0")}.md`)}>NIP-{a.toString().padStart(2, "0")}</span>)}
                    </div>
                </>)}
                <div className="flex mt10 f-end">
                    <div className="btn error" onClick={() => {
                        dispatch(removeRelay(conn!.Address));
                        navigate("/settings/relays")
                    }}>Remove</div>
                </div>
            </div>
        </>
    )
}

export default RelayInfo;