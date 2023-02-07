import "./BackButton.css";

import ArrowBack from "Icons/ArrowBack";

interface BackButtonProps {
  text?: string;
  onClick?(): void;
}

const BackButton = ({ text = "Back", onClick }: BackButtonProps) => {
  const onClickHandler = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <button className="back-button" type="button" onClick={onClickHandler}>
      <ArrowBack />
      {text}
    </button>
  );
};

export default BackButton;
