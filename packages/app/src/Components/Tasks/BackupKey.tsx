import { CachedMetadata } from "@snort/system";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import Icon from "@/Components/Icons/Icon";
import { BaseUITask } from "@/Components/Tasks/index";
import { LoginSession } from "@/Utils/Login";

export class BackupKeyTask extends BaseUITask {
  id = "backup-key";
  noBaseStyle = true;

  check(_: CachedMetadata, session: LoginSession): boolean {
    return !this.state.muted && session.type == "private_key";
  }

  render() {
    return (
      <div className="p card">
        <div className="flex g12 bg-superdark p24 br">
          <div>
            <div className="p12 bg-dark circle">
              <Icon name="key" size={21} />
            </div>
          </div>
          <div className="flex flex-col g8">
            <div className="font-semibold text-xl">
              <FormattedMessage defaultMessage="Be sure to back up your keys!" />
            </div>
            <small>
              <FormattedMessage
                defaultMessage="No keys, no {app}, There is no way to reset it if you don't back up. It only takes a minute."
                id="YR2I9M"
                values={{
                  app: CONFIG.appNameCapitalized,
                }}
              />
            </small>
            <div className="flex g8">
              <Link to="/settings/keys">
                <button>
                  <FormattedMessage defaultMessage="Back up now" />
                </button>
              </Link>
              <button className="secondary" onClick={() => this.mute()}>
                <FormattedMessage defaultMessage="Already backed up" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
