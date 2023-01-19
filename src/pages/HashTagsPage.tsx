import { useParams } from "react-router-dom";
import Timeline from "../element/Timeline";

const HashTagsPage = () => {
    const params = useParams();

    return (
        <>
            <Timeline subject={{ type: "hashtag", items: [params.tag!] }} postsOnly={false} method={"TIME_RANGE"} />
        </>
    )
}

export default HashTagsPage;