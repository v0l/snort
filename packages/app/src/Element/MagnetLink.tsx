import { Magnet } from "Util";

interface MagnetLinkProps {
  magnet: Magnet;
}

const MagnetLink = ({ magnet }: MagnetLinkProps) => {
  return (
    <div className="note-invoice">
      <h4>Magnet Link</h4>
      <a href={magnet.raw} rel="noreferrer">
        {magnet.dn ?? magnet.infoHash}
      </a>
    </div>
  );
};

export default MagnetLink;
