import { countLeadingZeros, type TaggedNostrEvent } from "@snort/system";
import { useIntl } from "react-intl";

import { AsyncFooterIcon } from "@/Components/Event/Note/NoteFooter/AsyncFooterIcon";
import { findTag } from "@/Utils";

export const PowIcon = ({ ev }: { ev: TaggedNostrEvent }) => {
  const { formatMessage } = useIntl();

  const powValue = findTag(ev, "nonce") ? countLeadingZeros(ev.id) : undefined;
  if (!powValue) return null;

  return (
    <AsyncFooterIcon
      className="hidden md:flex flex-none min-w-[50px] md:min-w-[80px]"
      title={formatMessage({ defaultMessage: "Proof of Work", id: "grQ+mI" })}
      iconName="diamond"
      value={powValue}
    />
  );
};
