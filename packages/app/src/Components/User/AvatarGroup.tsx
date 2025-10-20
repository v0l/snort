import ProfileImage, { ProfileImageProps } from "@/Components/User/ProfileImage";

export function AvatarGroup({ ids, ...props }: { ids: string[] } & Omit<ProfileImageProps, "pubkey">) {
  return (
    <div className="flex items-center">
      {ids.map((a, index) => (
        <div className={`inline-block ${index > 0 ? "-ml-2" : ""}`} key={a} style={{ zIndex: ids.length - index }}>
          <ProfileImage pubkey={a} {...props} />
        </div>
      ))}
    </div>
  );
}
