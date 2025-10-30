import { Link } from "react-router-dom";

const Hashtag = ({ tag }: { tag: string }) => {
  return (
    <span className="text-highlight">
      <Link to={`/t/${tag}`} onClick={e => e.stopPropagation()} className="hover:underline">
        #{tag}
      </Link>
    </span>
  );
};

export default Hashtag;
