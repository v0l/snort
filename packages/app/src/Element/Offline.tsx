import Icon from "@/Icons/Icon";
import AsyncButton from "./AsyncButton";
import { FormattedMessage } from "react-intl";
import classNames from "classnames";

export function Offline({ onRetry, className }: { onRetry?: () => void | Promise<void>; className?: string }) {
  return (
    <div className={classNames("flex items-center g8", className)}>
      <Icon name="wifi-off" className="error" />
      <div className="error">
        <FormattedMessage defaultMessage="Offline" />
      </div>
      {onRetry && (
        <AsyncButton onClick={onRetry}>
          <FormattedMessage defaultMessage="Retry" />
        </AsyncButton>
      )}
    </div>
  );
}
