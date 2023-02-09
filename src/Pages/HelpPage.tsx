import { Link } from "react-router-dom";
import { KieranPubKey } from "Const";

export default function HelpPage() {
  return (
    <>
      <h2>NIP-05</h2>
      <p>
        If you have an enquiry about your NIP-05 order please DM <Link to={`/messages/${KieranPubKey}`}>Kieran</Link>
      </p>
    </>
  );
}
