import { useEffect, useState } from "react";
import Icon from "../Icons/Icon";
import Spinner from "../Icons/Spinner";

interface UrlStatusCheckProps {
  url: string;
}

export default function UrlStatusCheck({ url }: UrlStatusCheckProps) {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");

    fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    })
      .then(response => {
        if (response.ok) {
          setStatus("success");
        } else {
          setStatus("error");
        }
      })
      .catch(() => {
        setStatus("error");
      });

    return () => controller.abort();
  }, [url]);

  if (status === "loading") {
    return <Spinner width={16} />;
  }

  if (status === "success") {
    return <Icon name="check" className="text-green-500" size={16} />;
  }

  return <Icon name="close" className="text-red-500" size={16} />;
}
