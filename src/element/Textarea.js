import { Component } from "react";

import ReactTextareaAutocomplete from "@webscopeio/react-textarea-autocomplete";

import Nip05, { useIsVerified } from "./Nip05";
import "@webscopeio/react-textarea-autocomplete/style.css";
import "./Textarea.css";
import Nostrich from "../nostrich.jpg";

function searchUsers(query, users) {
  const q = query.toLowerCase()
  return Object.values(users).filter(({ name, display_name, about }) => {
    return name.toLowerCase().includes(q) || display_name?.includes(q) || about?.includes(q)
  }).slice(0, 3)
}

const UserItem = ({ pubkey, display_name, picture, nip05, ...rest }) => {
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
    const { users, onChange, ...rest } = this.props
    return (
        <ReactTextareaAutocomplete
          {...rest}
          loadingComponent={() => <span>Loading....</span>}
          placeholder="Say something!"
          ref={rta => {
            this.rta = rta;
          }}
          onChange={onChange}
          trigger={{
             "@": {
               afterWhitespace: true,
               dataProvider: token => searchUsers(token, users),
               component: ({ entity }) => <UserItem {...entity} />,
               output: (item, trigger) => `@${item.pubkey}`
             }
           }}
        />
    )
  }
}
