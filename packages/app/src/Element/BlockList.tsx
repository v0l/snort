import BlockButton from "Element/BlockButton";
import ProfilePreview from "Element/ProfilePreview";
import useModeration from "Hooks/useModeration";

export default function BlockList() {
  const { blocked } = useModeration();

  return (
    <div className="main-content">
      {blocked.map(a => {
        return <ProfilePreview actions={<BlockButton pubkey={a} />} pubkey={a} options={{ about: false }} key={a} />;
      })}
    </div>
  );
}
