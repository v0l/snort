import DmWindow from "Element/DmWindow";
import { useParams } from "react-router-dom";
import { bech32ToHex } from "Util";

import "./ChatPage.css";

export default function ChatPage() {
  const { id } = useParams();

  return (
    <div className="chat-page">
      <DmWindow id={bech32ToHex(id ?? "")} />
    </div>
  );
}
