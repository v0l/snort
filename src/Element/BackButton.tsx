import "./BackButton.css"

import { useNavigate } from "react-router-dom";

import ArrowBack from "Icons/ArrowBack";

interface BackButtonProps {
  onClick?(): void
}

const BackButton = ({ onClick }: BackButtonProps) => {
  const navigate = useNavigate()
  const onClickHandler = () => {
    if (onClick) {
      onClick()
    } else {
      navigate(-1)
    }
  }

  return (
    <button className="back-button" type="button" onClick={onClickHandler}>
      <ArrowBack />Back
    </button>
  )
}

export default BackButton
