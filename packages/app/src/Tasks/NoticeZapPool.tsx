import { FormattedMessage, FormattedNumber } from "react-intl";
import { Link } from "react-router-dom";
import { BaseUITask } from "Tasks";

export class NoticeZapPoolDefault extends BaseUITask {
  id = "zap-pool-default";

  check(): boolean {
    return !this.state.muted && CONFIG.defaultZapPoolFee !== undefined;
  }

  render() {
    return (
      <>
        <p>
          <FormattedMessage
            defaultMessage="A default Zap Pool split of {n} has been configured for {site} developers, you can disable it at any time in {link}"
            values={{
              site: CONFIG.appNameCapitalized,
              n: (
                <FormattedNumber
                  value={(CONFIG.defaultZapPoolFee ?? 0) / 100}
                  style="percent"
                  maximumFractionDigits={2}
                />
              ),
              link: (
                <Link to="/zap-pool">
                  <FormattedMessage defaultMessage="Zap Pool" />
                </Link>
              ),
            }}
          />
        </p>
      </>
    );
  }
}
