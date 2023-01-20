import { Link } from 'react-router-dom'
import './Hashtag.css'

const Hashtag = ({ tag }: { tag: string }) => {
  return (
    <span className="hashtag">
      <Link to={`/t/${tag}`} onClick={(e) => e.stopPropagation()}>#{tag}</Link>
    </span>
  )
}

export default Hashtag
