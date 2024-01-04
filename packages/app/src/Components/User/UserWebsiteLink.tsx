import "./UserWebsiteLink.css";
import { MetadataCache, UserMetadata } from "@snort/system";
import Icon from "@/Components/Icons/Icon";

export function UserWebsiteLink({ user }: { user?: MetadataCache | UserMetadata }) {
  const website_url =
    user?.website && !user.website.startsWith("http") ? "https://" + user.website : user?.website || "";

  function tryFormatWebsite(url: string) {
    try {
      const u = new URL(url);
      return `${u.hostname}${u.pathname !== "/" ? u.pathname : ""}`;
    } catch {
      // ignore
    }
    return url;
  }

  if (user?.website) {
    return (
      <div className="user-profile-link f-ellipsis flex gap-2 items-center">
        <Icon name="link-02" size={16} />
        <a href={website_url} target="_blank" rel="noreferrer">
          {tryFormatWebsite(user.website)}
        </a>
      </div>
    );
  }
}
