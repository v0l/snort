import { useParams } from "react-router-dom";
import Timeline from "Element/Timeline";

const HashTagsPage = () => {
    const params = useParams();
    const tag = params.tag!.toLowerCase();

    return (
        <>
            <h2>#{tag}</h2>
            <Timeline key={tag} subject={{ type: "hashtag", items: [tag] }} postsOnly={false} method={"TIME_RANGE"} />
        </>
    )
}

export default HashTagsPage;