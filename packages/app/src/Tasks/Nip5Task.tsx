import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";
import { MetadataCache } from "Cache";
import { BaseUITask } from "Tasks";

export class Nip5Task extends BaseUITask {
  id = "buy-nip5";

  check(user: MetadataCache): boolean {
    return !this.state.muted && !user.nip05;
  }

  render(): JSX.Element {
    return (
      <p>
        <FormattedMessage
          defaultMessage="Hey, it looks like you dont have a NIP-05 handle yet, you should get one! Check out {link}"
          values={{
            link: (
              <Link to="/verification">
                <FormattedMessage defaultMessage="NIP-05 Shop" />
              </Link>
            ),
          }}
        />
      </p>
    );
  }
}
