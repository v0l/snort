import classNames from "classnames";
import { FormattedMessage } from "react-intl";

import SearchBox from "@/Components/SearchBox/SearchBox";
import TrendingHashtags from "@/Components/Trending/TrendingHashtags";
import TrendingNotes from "@/Components/Trending/TrendingPosts";
import useLogin from "@/Hooks/useLogin";

export default function RightColumn() {
  const { pubkey } = useLogin(s => ({ pubkey: s.publicKey }));
  const hideRightColumnPaths = ["/login", "/new", "/messages"];
  const show = !hideRightColumnPaths.some(path => location.pathname.startsWith(path));

  const getTitleMessage = () => {
    return pubkey ? (
      <FormattedMessage defaultMessage="Trending notes" id="6k7xfM" />
    ) : (
      <FormattedMessage defaultMessage="Trending hashtags" id="CbM2hK" />
    );
  };

  const getContent = () => {
    return pubkey ? <TrendingNotes small={true} count={100} /> : <TrendingHashtags short={true} />;
  };

  return (
    <div
      className={classNames(
        "text-secondary flex-col hidden lg:w-1/3 sticky top-0 h-screen py-3 px-4 border-l border-border-color",
        {
          "lg:flex": show,
        },
      )}>
      <div>
        <SearchBox />
      </div>
      <div className="font-bold text-xs mt-4 mb-2 uppercase tracking-wide">{getTitleMessage()}</div>
      <div className="overflow-y-auto hide-scrollbar flex-grow rounded-lg">{getContent()}</div>
    </div>
  );
}
