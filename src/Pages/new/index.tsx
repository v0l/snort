import { useSelector } from "react-redux";
import { RouteObject, useNavigate } from "react-router-dom";

import Copy from "Element/Copy";
import { RootState } from "State/Store";
import { hexToBech32 } from "Util";
import NewUserProfile from "Pages/new//NewProfile";
import ImportFollows from "Pages/new/ImportFollows";
import DiscoverFollows from "Pages/new/DiscoverFollows";

export const NewUserRoutes: RouteObject[] = [
  {
    path: "/new",
    element: <NewUserFlow />,
  },
  {
    path: "/new/profile",
    element: <NewUserProfile />,
  },
  {
    path: "/new/import",
    element: <ImportFollows />,
  },
  {
    path: "/new/discover",
    element: <DiscoverFollows />,
  },
];

export default function NewUserFlow() {
  const { privateKey } = useSelector((s: RootState) => s.login);
  const navigate = useNavigate();

  return (
    <>
      <h1>Welcome to Snort!</h1>
      <p>
        Snort is a Nostr UI, nostr is a decentralised protocol for saving and
        distributing "notes".
      </p>
      <p>
        Notes hold text content, the most popular usage of these notes is to
        store "tweet like" messages.
      </p>
      <p>Snort is designed to have a similar experience to Twitter.</p>

      <h2>Keys</h2>
      <p>
        Nostr uses digital signature technology to provide tamper proof notes
        which can safely be replicated to many relays to provide redundant
        storage of your content.
      </p>
      <p>
        This means that nobody can modify notes which you have created and
        everybody can easily verify that the notes they are reading are created
        by you.
      </p>
      <p>
        This is the same technology which is used by Bitcoin and has been proven
        to be extremely secure.
      </p>

      <h2>Your Key</h2>
      <p>
        When you want to author new notes you need to sign them with your
        private key, as with Bitcoin private keys these need to be kept secure.
      </p>
      <p>Please now copy your private key and save it somewhere secure:</p>
      <div className="card">
        <Copy text={hexToBech32("nsec", privateKey ?? "")} />
      </div>
      <p>
        It is also recommended to use one of the following browser extensions if
        you are on a desktop computer to secure your key:
      </p>
      <ul>
        <li>
          <a href="https://getalby.com/" target="_blank" rel="noreferrer">
            Alby
          </a>
        </li>
        <li>
          <a
            href="https://github.com/fiatjaf/nos2x"
            target="_blank"
            rel="noreferrer"
          >
            nos2x
          </a>
        </li>
      </ul>
      <p>You can also use these extensions to login to most Nostr sites.</p>
      <button onClick={() => navigate("/new/profile")}>Next</button>
    </>
  );
}
