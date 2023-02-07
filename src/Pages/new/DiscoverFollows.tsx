import { RecommendedFollows } from "Const";
import FollowListBase from "Element/FollowListBase";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

export default function DiscoverFollows() {
  const navigate = useNavigate();

  const sortedRecommends = useMemo(() => {
    return RecommendedFollows.sort(() => (Math.random() >= 0.5 ? -1 : 1));
  }, []);

  return (
    <>
      <h2>Follow some popular accounts</h2>
      <button onClick={() => navigate("/")}>Skip</button>
      {sortedRecommends.length > 0 && (
        <FollowListBase pubkeys={sortedRecommends} />
      )}
      <button onClick={() => navigate("/")}>Done!</button>
    </>
  );
}
