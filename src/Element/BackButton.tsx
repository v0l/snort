import "./BackButton.css"

import ArrowBack from "Icons/ArrowBack";

interface BackButtonProps {
  onClick?(): void
}

const BackButton = ({ onClick }: BackButtonProps) => {
  const onClickHandler = () => {
    if (onClick) {
      onClick()
    }
  }

  return (
    <button className="back-button" type="button" onClick={onClickHandler}>
      <ArrowBack />Back
    </button>
  )
}

export default BackButton
