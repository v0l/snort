import ProfileImage, { ProfileImageProps } from "@/Components/User/ProfileImage";

export function AvatarGroup({ ids, ...props }: { ids: string[] } & Omit<ProfileImageProps, "pubkey">) {
  // set defaults
  props.showUsername ??= false;
  props.link ??= "";
  props.size ??= 24;
  props.showFollowDistance ??= false;
  props.showProfileCard ??= false;

  return (
    <div className="flex items-center">
      {ids.map((a, index) => (
        <div className={`inline-block ${index > 0 ? "-ml-2" : ""}`} key={a}>
          <ProfileImage pubkey={a} {...props} />
        </div>
      ))}
    </div>
  );
}
