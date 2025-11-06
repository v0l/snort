import { FormattedMessage } from "react-intl";

import { Magnet } from "@/Utils";
import Icon from "../Icons/Icon";

interface MagnetLinkProps {
  magnet: Magnet;
}

const MagnetLink = ({ magnet }: MagnetLinkProps) => {
  return (
    <div className="border rounded-lg p-6 flex-col items-start relative bg-[image:var(--invoice-gradient)]">
      <h4>
        <FormattedMessage defaultMessage="Magnet Link" />
      </h4>
      <a href={magnet.raw} rel="noreferrer" className="flex gap-2 items-center">
        <Icon name="link" size={16} />
        {magnet.dn ?? magnet.infoHash}
      </a>
    </div>
  );
};

export default MagnetLink;
