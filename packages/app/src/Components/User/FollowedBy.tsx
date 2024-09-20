import { HexKey, socialGraphInstance } from "@snort/system";
import React, { Fragment, useMemo } from "react";
import { FormattedMessage } from "react-intl";

import { AvatarGroup } from "@/Components/User/AvatarGroup";
import DisplayName from "@/Components/User/DisplayName";
import { ProfileLink } from "@/Components/User/ProfileLink";

const MAX_FOLLOWED_BY_FRIENDS = 3;

export default function FollowedBy({ pubkey }: { pubkey: HexKey }) {
  const followDistance = socialGraphInstance.getFollowDistance(pubkey);
  const { followedByFriendsArray, totalFollowedByFriends } = useMemo(() => {
    const followedByFriends = socialGraphInstance.followedByFriends(pubkey);
    return {
      followedByFriendsArray: Array.from(followedByFriends).slice(0, MAX_FOLLOWED_BY_FRIENDS),
      totalFollowedByFriends: followedByFriends.size,
    };
  }, [pubkey, followDistance]);

  const renderFollowedByFriendsLinks = () => {
    return followedByFriendsArray.map((a, index) => (
      <Fragment key={a}>
        <ProfileLink pubkey={a} className="link inline">
          <DisplayName user={undefined} pubkey={a} />
        </ProfileLink>
        {index < followedByFriendsArray.length - 1 && ","}{" "}
      </Fragment>
    ));
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        <AvatarGroup ids={followedByFriendsArray} />
      </div>
      {totalFollowedByFriends > 0 && (
        <div className="text-gray-light">
          <span className="mr-1">
            <FormattedMessage defaultMessage="Followed by" />
          </span>
          {renderFollowedByFriendsLinks()}
          {totalFollowedByFriends > MAX_FOLLOWED_BY_FRIENDS && (
            <span>
              <FormattedMessage
                defaultMessage="and {count} others you follow"
                id="CYkOCI"
                values={{ count: totalFollowedByFriends - MAX_FOLLOWED_BY_FRIENDS }}
              />
            </span>
          )}
        </div>
      )}
      {followDistance > 3 && (
        <div className="text-gray-light">
          <FormattedMessage defaultMessage="Not followed by anyone you follow" />
        </div>
      )}
      {followDistance === 3 && ( // TODO "followed by friends of {n} friends"
        <div className="text-gray-light">
          <FormattedMessage defaultMessage="Followed by friends of friends" />
        </div>
      )}
    </div>
  );
}
