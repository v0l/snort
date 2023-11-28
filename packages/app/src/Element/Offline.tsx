import Icon from "@/Icons/Icon";
import AsyncButton from "./Button/AsyncButton";
import { FormattedMessage } from "react-intl";
import classNames from "classnames";

export function Offline({ onRetry, className }: { onRetry?: () => void | Promise<void>; className?: string }) {
  return (
    <div className={classNames("flex items-center g8", className)}>
      <Icon name="wifi-off" className="error" />
      <div className="error">
        <FormattedMessage defaultMessage="Offline" id="7UOvbT" />
      </div>
      {onRetry && (
        <AsyncButton onClick={onRetry}>
          <FormattedMessage defaultMessage="Retry" id="62nsdy" />
        </AsyncButton>
      )}
    </div>
  );
}
