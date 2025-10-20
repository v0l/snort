const UnreadCount = ({ unread }: { unread: number }) => {
  return (
    <span
      className={`text-font-color text-sm inline-block px-2 py-0.5 rounded-[10px] select-none mx-1 my-0.5 hover:cursor-pointer ${unread > 0 ? "bg-highlight light:text-white" : "bg-neutral-800"}`}>
      {unread}
    </span>
  );
};

export default UnreadCount;
