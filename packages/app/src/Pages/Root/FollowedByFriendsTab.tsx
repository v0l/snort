import Timeline from "@/Components/Feed/Timeline";
import { TimelineSubject } from "@/Feed/TimelineFeed";
import useLogin from "@/Hooks/useLogin";

export const FollowedByFriendsTab = () => {
  const { publicKey } = useLogin();
  const subject: TimelineSubject = {
    type: "global",
    items: [],
    discriminator: `followed-by-friends-${publicKey}`,
    streams: true,
  };

  return <Timeline followDistance={2} subject={subject} postsOnly={true} method={"TIME_RANGE"} />;
};
