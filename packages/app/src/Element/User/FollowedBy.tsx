import FollowDistanceIndicator from "@/Element/User/FollowDistanceIndicator";
import ProfileImage from "@/Element/User/ProfileImage";
import { FormattedMessage } from "react-intl";
import { Fragment } from "react";
import { ProfileLink } from "@/Element/User/ProfileLink";
import DisplayName from "@/Element/User/DisplayName";
import { socialGraphInstance } from "@snort/system";

const MAX_FOLLOWED_BY_FRIENDS = 3;

export default function FollowedBy({ pubkey }: { pubkey: string }) {
  const followedByFriends = socialGraphInstance.followedByFriends(pubkey);
  const followedByFriendsArray = Array.from(followedByFriends).slice(0, MAX_FOLLOWED_BY_FRIENDS);
  return (
    <div className="flex flex-row items-center">
      <div className="flex flex-row items-center">
        <FollowDistanceIndicator className="p-2" pubkey={pubkey} />
        {followedByFriendsArray.map((a, index) => {
          const zIndex = followedByFriendsArray.length - index;

          return (
            <div className={`inline-block ${index > 0 ? "-ml-5" : ""}`} key={a} style={{ zIndex }}>
              <ProfileImage showFollowDistance={false} pubkey={a} size={24} showUsername={false} />
            </div>
          );
        })}
      </div>
      {followedByFriends.size > 0 && (
        <div className="text-gray-light">
          <span className="mr-1">
            <FormattedMessage defaultMessage="Followed by" id="6mr8WU" />
          </span>
          {followedByFriendsArray.map((a, index) => (
            <Fragment key={a}>
              <ProfileLink pubkey={a} className="link inline">
                <DisplayName user={undefined} pubkey={a} />
              </ProfileLink>
              {index < followedByFriendsArray.length - 1 && ","}{" "}
            </Fragment>
          ))}
          {followedByFriends.size > MAX_FOLLOWED_BY_FRIENDS && (
            <span>
              <FormattedMessage
                defaultMessage="and {count} others you follow"
                id="CYkOCI"
                values={{ count: followedByFriends.size - MAX_FOLLOWED_BY_FRIENDS }}
              />
            </span>
          )}
        </div>
      )}
      {followedByFriends.size === 0 && (
        <div className="text-gray-light">
          <FormattedMessage defaultMessage="Not followed by anyone you follow" id="IgsWFG" />
        </div>
      )}
    </div>
  );
}
