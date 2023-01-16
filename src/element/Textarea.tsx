import { useLiveQuery } from "dexie-react-hooks";

import ReactTextareaAutocomplete from "@webscopeio/react-textarea-autocomplete";
import TextareaAutosize from "react-textarea-autosize";

// @ts-expect-error
import Nip05 from "./Nip05";
import "@webscopeio/react-textarea-autocomplete/style.css";
import "./Textarea.css";
// @ts-expect-error
import Nostrich from "../nostrich.jpg";
import { hexToBech32 } from "../Util";
import { db } from "../db";
import { MetadataCache } from "../db/User";

function searchUsers(query: string, users: MetadataCache[]) {
  const q = query.toLowerCase()
  return users.filter(({ name, display_name, about, nip05 }: MetadataCache) => {
    return name?.toLowerCase().includes(q)
      || display_name?.toLowerCase().includes(q)
      || about?.toLowerCase().includes(q)
      || nip05?.toLowerCase().includes(q)
  }).slice(0, 3)
}

const UserItem = ({ pubkey, display_name, picture, nip05, ...rest }: MetadataCache) => {
  return (
    <div key={pubkey} className="user-item">
      <div className="user-picture">
        {picture && <img src={picture ? picture : Nostrich} className="picture" />}
      </div>
      <div className="user-details">
        <strong>{display_name || rest.name}</strong>
        <Nip05 nip05={nip05} pubkey={pubkey} />
      </div>
    </div>
  )
}

const Textarea = ({ users, onChange, ...rest }: any) => {
  const allUsers = useLiveQuery(
    () => db.users.toArray()
  );

  return (
    <ReactTextareaAutocomplete
      {...rest}
      loadingComponent={() => <span>Loading....</span>}
      placeholder="Say something!"
      onChange={onChange}
      textAreaComponent={TextareaAutosize}
      trigger={{
        "@": {
          afterWhitespace: true,
          dataProvider: token => allUsers ? searchUsers(token, allUsers) : [],
          component: (props: any) => <UserItem {...props.entity} />,
          output: (item: any) => `@${hexToBech32("npub", item.pubkey)}`
        }
      }}
    />
  )
}

export default Textarea
