import { useSelector } from "react-redux";
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
import type { User } from "../nostr/types";
import { db } from "../db";

function searchUsers(query: string, users: User[]) {
  const q = query.toLowerCase()
  return users.filter(({ name, display_name, about, nip05 }: User) => {
    return name?.toLowerCase().includes(q)
      || display_name?.toLowerCase().includes(q)
      || about?.toLowerCase().includes(q)
      || nip05?.toLowerCase().includes(q)
  }).slice(0, 3)
}

const UserItem = ({ pubkey, display_name, picture, nip05, ...rest }: User) => {
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

function normalizeUser({ pubkey, picture, nip05, name, display_name }: User) {
  return { pubkey, nip05, name, picture, display_name }
}

const Textarea = ({ users, onChange, ...rest }: any) => {
    const normalizedUsers = Object.keys(users).reduce((acc, pk) => {
      return {...acc, [pk]: normalizeUser(users[pk]) }
    }, {})
    const dbUsers = useLiveQuery(
      () => db.users.toArray().then(usrs => {
        return usrs.reduce((acc, usr) => {
          return { ...acc, [usr.pubkey]: normalizeUser(usr)}
        }, {})
      })
    )
    const allUsers: User[] = Object.values({...normalizedUsers, ...dbUsers})

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
               dataProvider: token => dbUsers ? searchUsers(token, allUsers) : [],
               component: (props: any) => <UserItem {...props.entity} />,
               output: (item: any) => `@${hexToBech32("npub", item.pubkey)}`
             }
           }}
        />
    )
}

export default Textarea
