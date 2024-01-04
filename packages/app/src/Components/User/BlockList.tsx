import BlockButton from "@/Components/User/BlockButton";
import ProfilePreview from "@/Components/User/ProfilePreview";
import useModeration from "@/Hooks/useModeration";

export default function BlockList() {
  const { blocked } = useModeration();

  return (
    <div className="main-content p">
      {blocked.map(a => {
        return <ProfilePreview actions={<BlockButton pubkey={a} />} pubkey={a} options={{ about: false }} key={a} />;
      })}
    </div>
  );
}
