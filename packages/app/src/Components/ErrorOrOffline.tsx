import { OfflineError } from "@snort/shared";
import classNames from "classnames";

import Icon from "@/Components/Icons/Icon";

import { Offline } from "./Offline";

export function ErrorOrOffline({
  error,
  onRetry,
  className,
}: {
  error: Error;
  onRetry?: () => void | Promise<void>;
  className?: string;
}) {
  if (error instanceof OfflineError) {
    return <Offline onRetry={onRetry} className={className} />;
  } else {
    return (
      <div className={classNames("flex flex-row items-center px-4 py-3 gap-2", className)}>
        <Icon name="alert-circle" size={24} />
        <b>{error.message}</b>
      </div>
    );
  }
}
