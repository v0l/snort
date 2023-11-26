import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";

export interface NoteTimeProps {
  from: number;
  fallback?: string;
}

const secondsInAMinute = 60;
const secondsInAnHour = secondsInAMinute * 60;
const secondsInADay = secondsInAnHour * 24;

export default function NoteTime(props: NoteTimeProps) {
  const [time, setTime] = useState<string | JSX.Element>();
  const { from, fallback } = props;

  const absoluteTime = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "long",
  }).format(from);

  const isoDate = new Date(from).toISOString();

  function calcTime() {
    const fromDate = new Date(from);
    const currentTime = new Date();
    const timeDifference = Math.floor((currentTime.getTime() - fromDate.getTime()) / 1000);

    if (timeDifference < secondsInAMinute) {
      return <FormattedMessage defaultMessage="now" id="kaaf1E" />;
    } else if (timeDifference < secondsInAnHour) {
      return `${Math.floor(timeDifference / secondsInAMinute)}m`;
    } else if (timeDifference < secondsInADay) {
      return `${Math.floor(timeDifference / secondsInAnHour)}h`;
    } else {
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
  }

  useEffect(() => {
    setTime(calcTime());
    const t = setInterval(() => {
      setTime(s => {
        const newTime = calcTime();
        if (newTime !== s) {
          return newTime;
        }
        return s;
      });
    }, 60_000); // update every minute
    return () => clearInterval(t);
  }, [from]);

  return (
    <time dateTime={isoDate} title={absoluteTime}>
      {time || fallback}
    </time>
  );
}
