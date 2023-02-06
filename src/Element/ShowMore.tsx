import './ShowMore.css'

interface ShowMoreProps {
  text?: string
  className?: string
  onClick: () => void
}

const ShowMore = ({ text = "Show more", onClick, className = "" }: ShowMoreProps) => {
  const classNames = className ? `show-more ${className}` : "show-more"
  return (
    <div className="show-more-container">
      <button className={classNames} onClick={onClick}>
        {text}
      </button>
    </div>
  )
}

export default ShowMore
