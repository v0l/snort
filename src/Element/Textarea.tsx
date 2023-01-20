import "@webscopeio/react-textarea-autocomplete/style.css";
import "./Textarea.css";

import { useState } from "react";
import ReactTextareaAutocomplete from "@webscopeio/react-textarea-autocomplete";
import emoji from "@jukben/emoji-search";
import TextareaAutosize from "react-textarea-autosize";

import Avatar from "Element/Avatar";
import Nip05 from "Element/Nip05";
import { hexToBech32 } from "Util";
import { db } from "Db";
import { useQuery, MetadataCache } from "State/Users";

interface EmojiItemProps {
  name: string
  char: string
}

const EmojiItem = ({ entity: { name, char } }: { entity: EmojiItemProps }) => {
  return (
    <div className="emoji-item">
      <div className="emoji">{char}</div>
      <div className="emoji-name">{name}</div>
    </div>
  )
}

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

  const allUsers = useQuery(query)

  const userDataProvider = (token: string) => {
    setQuery(token)
    return allUsers
  }

  const emojiDataProvider = (token: string) => {
    return emoji(token)
      .slice(0, 5)
      .map(({ name, char }) => ({ name, char }));
  }

  return (
    <ReactTextareaAutocomplete
      {...rest}
      loadingComponent={() => <span>Loading....</span>}
      placeholder="Say something!"
      onChange={onChange}
      textAreaComponent={TextareaAutosize}
      trigger={{
        ":": {
          dataProvider: emojiDataProvider,
          component: EmojiItem,
          output: (item: EmojiItemProps, trigger) => item.char
        },
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
