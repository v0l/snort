import type { CachedMetadata, UserMetadata } from "@snort/system";

import Icon from "@/Components/Icons/Icon";

export function UserWebsiteLink({ user }: { user?: CachedMetadata | UserMetadata }) {
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
      <div className="flex items-center gap-2">
        <Icon name="link-02" size={16} />
        <a
          href={website_url}
          target="_blank"
          rel="noreferrer"
          className="text-ellipsis overflow-hidden hover:underline cursor-pointer">
          {tryFormatWebsite(user.website)}
        </a>
      </div>
    );
  }
}
