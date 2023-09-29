import "./ShowMore.css";
import { useIntl } from "react-intl";

import messages from "../messages";

interface ShowMoreProps {
  text?: string;
  className?: string;
  onClick: () => void;
}

const ShowMore = ({ text, onClick, className = "" }: ShowMoreProps) => {
  const { formatMessage } = useIntl();
  const defaultText = formatMessage(messages.ShowMore);
  const classNames = className ? `show-more ${className}` : "show-more";
  return (
    <div className="show-more-container">
      <button className={classNames} onClick={onClick}>
        {text || defaultText}
      </button>
    </div>
  );
};

export default ShowMore;
