import React, { ReactNode,useCallback, useEffect, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";

export interface NoteTimeProps {
  from: number;
  fallback?: string;
}

const secondsInAMinute = 60;
const secondsInAnHour = secondsInAMinute * 60;
const secondsInADay = secondsInAnHour * 24;

const NoteTime: React.FC<NoteTimeProps> = ({ from, fallback }) => {
  const calcTime = useCallback((fromTime: number) => {
    const currentTime = new Date();
    const timeDifference = Math.floor((currentTime.getTime() - fromTime) / 1000);

    if (timeDifference < secondsInAMinute) {
      return <FormattedMessage defaultMessage="now" id="kaaf1E" />;
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

  const [time, setTime] = useState<string | ReactNode>(calcTime(from));

  const absoluteTime = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "long",
      }).format(from),
    [from],
  );

  const isoDate = useMemo(() => new Date(from).toISOString(), [from]);

  useEffect(() => {
    const t = setInterval(() => {
      const newTime = calcTime(from);
      setTime(s => (s !== newTime ? newTime : s));
    }, 60_000); // update every minute

    return () => clearInterval(t);
  }, [from]);

  return (
    <time dateTime={isoDate} title={absoluteTime}>
      {time || fallback}
    </time>
  );
};

export default NoteTime;
