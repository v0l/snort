import SearchBox from "@/Element/SearchBox";
import TrendingUsers from "@/Element/TrendingUsers";
import TrendingHashtags from "@/Element/TrendingHashtags";
import TrendingNotes from "@/Element/TrendingPosts";
import { FormattedMessage } from "react-intl";

export default function RightColumn() {
  return (
    <div className="flex-col hidden lg:flex lg:w-1/3 sticky top-0 h-screen p-2 border-l border-neutral-900">
      <div>
        <SearchBox />
      </div>
      <div className="overflow-y-auto hide-scrollbar">
        <div className="bg-superdark rounded-lg p-2 mt-8">
          <div className="font-bold text-lg">
            <FormattedMessage defaultMessage="Trending hashtags" id="CbM2hK" />
          </div>
          <TrendingHashtags short={true} count={5} />
        </div>
        <div className="bg-superdark rounded-lg p-2 mt-8">
          <div className="font-bold text-lg">
            <FormattedMessage defaultMessage="Trending notes" id="6k7xfM" />
          </div>
          <TrendingNotes count={5} />
        </div>
        <div className="bg-superdark rounded-lg p-2 mt-8">
          <div className="font-bold text-lg">
            <FormattedMessage defaultMessage="Trending users" id="arZnG2" />
          </div>
          <TrendingUsers count={5} />
        </div>
      </div>
    </div>
  );
}
