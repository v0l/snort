import { RecommendedFollows } from "../Const";
import ProfilePreview from "../element/ProfilePreview";

export default function NewUserPage(props) {
    return (
        <>
            <h2>Hmm you're not following anybody?</h2>
            <h4>Here are some suggestions:</h4>
            {RecommendedFollows
                .sort(a => Math.random() >= 0.5 ? -1 : 1)
                .map(a => <ProfilePreview key={a} pubkey={a.toLowerCase()} />)}
        </>
    )
}