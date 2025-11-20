import { TimelineRenderer } from "@/Components/Feed/TimelineRenderer";
import { useBlindSpot } from "@/Hooks/useBlindSpot";

export function BlindSpots() {
  const data = useBlindSpot();

  const frag = {
    events: data,
    refTime: 0,
  };

  return <TimelineRenderer frags={frag} latest={[]} showLatest={() => {}} />;
}
