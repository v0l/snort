import "./UnreadCount.css";

const UnreadCount = ({ unread }: { unread: number }) => {
  return <span className={`pill ${unread > 0 ? "unread" : ""}`}>{unread}</span>;
};

export default UnreadCount;
