import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import { BaseUITask } from "@/Components/Tasks/index";

export class DonateTask extends BaseUITask {
  id = "donate";

  check(): boolean {
    return !this.state.muted;
  }

  render() {
    return (
      <div className="flex flex-col gap-2">
        <FormattedMessage
          defaultMessage="Thanks for using {site}, please consider donating if you can."
          values={{ site: CONFIG.appNameCapitalized }}
        />
        <Link to="/donate">
          <button>
            <FormattedMessage defaultMessage="Donate" />
          </button>
        </Link>
      </div>
    );
  }
}
