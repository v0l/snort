import { RecommendedFollows } from "Const";
import FollowListBase from "Element/FollowListBase";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

export default function DiscoverFollows() {
  const navigate = useNavigate();

  const sortedReccomends = useMemo(() => {
    return RecommendedFollows.sort((a) => (Math.random() >= 0.5 ? -1 : 1));
  }, []);

  return (
    <>
      <h2>Follow some popular accounts</h2>
      <button onClick={() => navigate("/")}>Skip</button>
      {sortedReccomends.length > 0 && (
        <FollowListBase pubkeys={sortedReccomends} />
      )}
      <button onClick={() => navigate("/")}>Done!</button>
    </>
  );
}
