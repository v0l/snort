import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";
import { MetadataCache } from "@snort/system";
import { BaseUITask } from "@/Tasks";

export class Nip5Task extends BaseUITask {
  id = "buy-nip5";

  check(user: MetadataCache): boolean {
    return !this.state.muted && !user.nip05;
  }

  render(): JSX.Element {
    return (
      <p>
        <FormattedMessage
          defaultMessage="Hey, it looks like you dont have a Nostr Address yet, you should get one! Check out {link}"
          id="ojzbwv"
          values={{
            link: (
              <Link to="/nostr-address">
                <FormattedMessage defaultMessage="Buy nostr address" id="MuVeKe" />
              </Link>
            ),
          }}
        />
      </p>
    );
  }
}
