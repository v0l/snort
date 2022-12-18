import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import useProfileFeed from "./feed/ProfileFeed";

export default function ProfilePage() {
    const params = useParams();
    const id = params.id;
    useProfileFeed(id);
    
    const user = useSelector(s => s.users.users[id]);

    return (
        <div className="profile">
            <img src={user?.picture} />
        </div>
    )
}