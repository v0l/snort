import "./BackButton.css"

import { useNavigate } from "react-router-dom";

import ArrowBack from "Icons/ArrowBack";

const BackButton = () => {
  const navigate = useNavigate()

  return (
    <button className="back-button" type="button" onClick={() => navigate(-1)}>
      <ArrowBack />Back
    </button>
  )
}

export default BackButton
