import FormattedMessage from "@snort/app/src/Element/FormattedMessage";
import { Link } from "react-router-dom";
import { BaseUITask } from "Tasks";

export class DonateTask extends BaseUITask {
  id = "donate";

  check(): boolean {
    return !this.state.muted;
  }

  render() {
    return (
      <>
        <p>
          <FormattedMessage defaultMessage="Thanks for using Snort, please consider donating if you can." />
        </p>
        <Link to="/donate">
          <button>
            <FormattedMessage defaultMessage="Donate" />
          </button>
        </Link>
      </>
    );
  }
}
