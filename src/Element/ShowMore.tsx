import './ShowMore.css'

interface ShowMoreProps {
  text?: string
  className?: string
  onClick: () => void
}

const ShowMore = ({ text = "Show more", onClick, className = "" }: ShowMoreProps) => {
  const classNames = className ? `show-more ${className}` : "show-more"
  return (
    <button className={classNames} onClick={onClick}>
      {text}
    </button>
  )
}

export default ShowMore
