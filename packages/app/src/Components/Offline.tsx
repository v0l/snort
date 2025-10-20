import classNames from "classnames";
import { FormattedMessage } from "react-intl";

import Icon from "@/Components/Icons/Icon";

import AsyncButton from "./Button/AsyncButton";

export function Offline({ onRetry, className }: { onRetry?: () => void | Promise<void>; className?: string }) {
  return (
    <div className={classNames("flex items-center gap-2", className)}>
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
