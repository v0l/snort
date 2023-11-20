import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";
import { BaseUITask } from "@/Tasks";

export class DonateTask extends BaseUITask {
  id = "donate";

  check(): boolean {
    return !this.state.muted;
  }

  render() {
    return (
      <>
        <p>
          <FormattedMessage
            defaultMessage="Thanks for using {site}, please consider donating if you can."
            id="fBlba3"
            values={{ site: CONFIG.appNameCapitalized }}
          />
        </p>
        <Link to="/donate">
          <button>
            <FormattedMessage defaultMessage="Donate" id="2IFGap" />
          </button>
        </Link>
      </>
    );
  }
}
