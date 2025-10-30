import React, { ReactNode, useCallback, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";

export interface NoteTimeProps {
  from: number;
  fallback?: string;
  className?: string;
}

const secondsInAMinute = 60;
const secondsInAnHour = secondsInAMinute * 60;
const secondsInADay = secondsInAnHour * 24;

const NoteTime: React.FC<NoteTimeProps> = ({ from, fallback, className }) => {
  const calcTime = useCallback((fromTime: number) => {
    const currentTime = new Date();
    const timeDifference = Math.floor((currentTime.getTime() - fromTime) / 1000);

    if (timeDifference < secondsInAMinute) {
      return <FormattedMessage defaultMessage="now" />;
    } else if (timeDifference < secondsInAnHour) {
      return `${Math.floor(timeDifference / secondsInAMinute)}m`;
    } else if (timeDifference < secondsInADay) {
      return `${Math.floor(timeDifference / secondsInAnHour)}h`;
    } else {
      const fromDate = new Date(fromTime);
      if (fromDate.getFullYear() === currentTime.getFullYear()) {
        return fromDate.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });
      } else {
        return fromDate.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
    }
  }, []);

  const [time] = useState<string | ReactNode>(calcTime(from));

  const absoluteTime = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "long",
      }).format(from),
    [from],
  );

  const isoDate = useMemo(() => new Date(from).toISOString(), [from]);

  return (
    <time dateTime={isoDate} title={absoluteTime} className={className ?? "text-sm text-neutral-500 font-medium"}>
      {time || fallback}
    </time>
  );
};

export default NoteTime;
