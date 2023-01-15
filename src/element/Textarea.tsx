import { useSelector } from "react-redux";
import { useLiveQuery } from "dexie-react-hooks";

import ReactTextareaAutocomplete from "@webscopeio/react-textarea-autocomplete";

// @ts-expect-error
import Nip05, { useIsVerified } from "./Nip05";
import "@webscopeio/react-textarea-autocomplete/style.css";
import "./Textarea.css";
// @ts-expect-error
import Nostrich from "../nostrich.jpg";
// @ts-expect-error
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
  const { isVerified, couldNotVerify, name, domain } = useIsVerified(nip05, pubkey)
  return (
    <div key={pubkey} className="user-item">
      <div className="user-picture">
        {picture && <img src={picture ? picture : Nostrich} className="picture" />}
      </div>
      <div className="user-details">
        <strong>{display_name || rest.name}</strong>
        <Nip05 name={name} domain={domain} isVerified={isVerified} couldNotVerify={couldNotVerify} />
      </div>
    </div>
  )
}

function normalizeUser({ pubkey, about, nip05, name, display_name }: User) {
  return { pubkey, about, nip05, name, display_name }
}

const Textarea = ({ onChange, ...rest }: any) => {
    // @ts-expect-error
    const { users } = useSelector(s => s.users)
    const dbUsers = useLiveQuery(
      () => db.users.toArray().then(usrs => {
        return usrs.reduce((acc, usr) => {
          return { ...acc, [usr.pubkey]: normalizeUser(usr)}
        }, {})
      })
    )
    const cachedUsers = dbUsers ? dbUsers : {}
    const allUsers: User[] = Object.values({...cachedUsers, ...users})

    return (
        <ReactTextareaAutocomplete
          {...rest}
          loadingComponent={() => <span>Loading....</span>}
          placeholder="Say something!"
          onChange={onChange}
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
