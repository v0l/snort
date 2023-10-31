import { OfflineError } from "@snort/shared";
import { Offline } from "./Offline";
import classNames from "classnames";

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
    return <b className={classNames("error", className)}>{error.message}</b>;
  }
}
