import SearchBox from "@/Element/SearchBox";
import TrendingNotes from "@/Element/Trending/TrendingPosts";
import { FormattedMessage } from "react-intl";
import classNames from "classnames";

export default function RightColumn() {
  const hideRightColumnPaths = ["/login", "/new", "/messages", "/settings"];
  const show = !hideRightColumnPaths.some(path => location.pathname.startsWith(path));
  return (
    <div
      className={classNames("flex-col hidden lg:w-1/3 sticky top-0 h-screen py-3 px-4 border-l border-neutral-900", {
        "lg:flex": show,
      })}>
      <div>
        <SearchBox />
      </div>
      <div className="overflow-y-auto hide-scrollbar">
        <div className="bg-superdark rounded-lg py-4 px-2 mt-8">
          <div className="font-bold text-lg px-[12px]">
            <FormattedMessage defaultMessage="Trending notes" id="6k7xfM" />
          </div>
          <TrendingNotes small={true} count={5} />
        </div>
      </div>
    </div>
  );
}
