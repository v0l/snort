import { Outlet } from "react-router-dom";
import { RecommendedFollows } from "../Const";
import ProfilePreview from "../element/ProfilePreview";

export default function NewUserPage(props) {

    function followSomebody() {
        return (
            <>
                <h2>Follow some popular accounts</h2>
                <h4>Here are some suggestions:</h4>
                {RecommendedFollows
                    .sort(a => Math.random() >= 0.5 ? -1 : 1)
                    .map(a => <ProfilePreview key={a} pubkey={a.toLowerCase()} />)}
            </>
        )
    }
    return followSomebody()
}