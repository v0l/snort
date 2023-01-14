import { Component } from "react";

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

function searchUsers(query: string, users: Record<string, User>) {
  const q = query.toLowerCase()
  return Object.values(users).filter(({ name, display_name, about, nip05 }) => {
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

export default class Textarea extends Component {
  render() {
    // @ts-expect-error
    const { users, onChange, ...rest } = this.props
    return (
        <ReactTextareaAutocomplete
          {...rest}
          loadingComponent={() => <span>Loading....</span>}
          placeholder="Say something!"
          ref={rta => {
            // @ts-expect-error
            this.rta = rta;
          }}
          onChange={onChange}
          trigger={{
             "@": {
               afterWhitespace: true,
               dataProvider: token => searchUsers(token, users),
               component: (props: any) => <UserItem {...props.entity} />,
               output: (item: any) => `@${hexToBech32("npub", item.pubkey)}`
             }
           }}
        />
    )
  }
}
