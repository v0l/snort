import { useParams } from "react-router-dom";
import Timeline from "Element/Timeline";
import { unwrap } from "Util";

const HashTagsPage = () => {
  const params = useParams();
  const tag = unwrap(params.tag).toLowerCase();

  return (
    <>
      <h2>#{tag}</h2>
      <Timeline
        key={tag}
        subject={{ type: "hashtag", items: [tag], discriminator: tag }}
        postsOnly={false}
        method={"TIME_RANGE"}
      />
    </>
  );
};

export default HashTagsPage;
