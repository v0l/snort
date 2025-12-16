import type { CachedMetadata } from "@snort/system";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import { BaseUITask } from "@/Components/Tasks/index";
import type { LoginSession } from "@/Utils/Login";

export class FollowMorePeopleTask extends BaseUITask {
  id = "follow-more-people";

  check(_meta: CachedMetadata, session: LoginSession): boolean {
    return !this.state.muted && (session.state.follows?.length ?? 0) < 10;
  }

  render() {
    return (
      <>
        <p>
          <FormattedMessage
            defaultMessage="It looks like you dont follow enough people, take a look at {newUsersPage} to discover people to follow!"
            values={{
              newUsersPage: (
                <Link to={"/discover"}>
                  <FormattedMessage defaultMessage="new users page" />
                </Link>
              ),
            }}
          />
        </p>
      </>
    );
  }
}
