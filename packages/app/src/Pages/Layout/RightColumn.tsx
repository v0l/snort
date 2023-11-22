import SearchBox from "../../Element/SearchBox";

export default function RightColumn() {
  return (
    <div className="flex-col hidden lg:flex lg:w-1/3 sticky top-0 h-screen p-2 border-l border-neutral-900">
      <div>
        <SearchBox />
      </div>
    </div>
  );
}
