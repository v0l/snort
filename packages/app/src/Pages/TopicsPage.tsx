import Timeline from "@/Components/Feed/Timeline";
import useLogin from "@/Hooks/useLogin";
import {useMemo} from "react";

export function TopicsPage() {
  const { tags, pubKey } = useLogin(s => ({ tags: s.tags.item, pubKey: s.publicKey }));
  const subject = useMemo(() => ({
    type: "hashtag",
    items: tags,
    discriminator: pubKey ?? "",
  }), [tags, pubKey]);

  return (
    <Timeline
      subject={subject}
      postsOnly={true}
      method="TIME_RANGE"
      loadMore={true}
      window={60 * 60 * 6}
    />
  );
}
