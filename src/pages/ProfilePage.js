import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";

export default function ProfilePage() {
    const params = useParams();
    const id = params.id;

    const user = useSelector(s => s.users.users[id]);

    return (
        <div className="profile">
            <img src={} />
        </div>
    )
}