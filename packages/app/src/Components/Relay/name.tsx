import useRelayState from "@/Feed/RelayState";
import { getRelayName } from "@/Utils";
import { Nip11, type RelayInfoDocument } from "@snort/system";
import { useEffect, useState } from "react";

export function RelayName({ url }: { url: string }) {
  const conn = useRelayState(url);
  const [info, setInfo] = useState<RelayInfoDocument | undefined>(conn?.info);

  useEffect(() => {
    if (!info) {
      Nip11.loadRelayDocument(url).then(setInfo).catch(console.error);
    }
  }, [info]);

  return info?.name ?? getRelayName(url);
}
