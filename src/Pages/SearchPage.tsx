import { useParams } from "react-router-dom";
import Timeline from "Element/Timeline";

const SearchPage = () => {
    const params = useParams();
    const keyword = params.keyword!.toLowerCase();

    return (
        <>
            <h2>Search results for: {keyword}</h2>
            <Timeline key={keyword} subject={{ type: "keyword", items: [keyword] }} postsOnly={false} method={"LIMIT_UNTIL"} />
        </>
    )
}

export default SearchPage;