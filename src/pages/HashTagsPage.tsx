import { useParams } from "react-router-dom";
import Timeline from "../element/Timeline";

const HashTagsPage = () => {
    const params = useParams();
    const tag = params.tag!.toLowerCase();

    return (
        <>
            <h2>#{tag}</h2>
            <Timeline subject={{ type: "hashtag", items: [tag] }} postsOnly={false} method={"TIME_RANGE"} />
        </>
    )
}

export default HashTagsPage;