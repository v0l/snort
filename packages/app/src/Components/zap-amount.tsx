import { formatShort } from "@/Utils/Number";

import Icon from "./Icons/Icon";

export default function ZapAmount({ n }: { n: number }) {
  return (
    <div className="flex gap-2 items-center text-xl font-bold">
      <Icon name="zap-solid" size={20} className="text-zap" />
      <span>{formatShort(n)}</span>
    </div>
  );
}
