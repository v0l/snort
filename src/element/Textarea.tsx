import "@webscopeio/react-textarea-autocomplete/style.css";
import "./Textarea.css";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ReactTextareaAutocomplete from "@webscopeio/react-textarea-autocomplete";
import TextareaAutosize from "react-textarea-autosize";

import Avatar from "./Avatar";
import Nip05 from "./Nip05";
import { hexToBech32 } from "../Util";
import { db } from "../db";
import { MetadataCache } from "../db/User";

const UserItem = (metadata: MetadataCache) => {
  const { pubkey, display_name, picture, nip05, ...rest } = metadata
  return (
    <div key={pubkey} className="user-item">
      <div className="user-picture">
        <Avatar user={metadata} />
      </div>
      <div className="user-details">
        <strong>{display_name || rest.name}</strong>
        <Nip05 nip05={nip05} pubkey={pubkey} />
      </div>
    </div>
  )
}

const Textarea = ({ users, onChange, ...rest }: any) => {
  const [query, setQuery] = useState('')

  const allUsers = useLiveQuery(
    () => db.users
          .where("name").startsWithIgnoreCase(query)
          .or("display_name").startsWithIgnoreCase(query)
          .or("nip05").startsWithIgnoreCase(query)
          .limit(5)
          .toArray(),
    [query],
  );

  const userDataProvider = (token: string) => {
    setQuery(token)
    return allUsers
  }

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
          dataProvider: userDataProvider,
          component: (props: any) => <UserItem {...props.entity} />,
          output: (item: any) => `@${hexToBech32("npub", item.pubkey)}`
        }
      }}
    />
  )
}

export default Textarea
