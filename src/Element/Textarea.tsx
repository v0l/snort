import "@webscopeio/react-textarea-autocomplete/style.css";
import "./Textarea.css";

import { useState } from "react";
import { useIntl } from "react-intl";
import ReactTextareaAutocomplete from "@webscopeio/react-textarea-autocomplete";
import emoji from "@jukben/emoji-search";
import TextareaAutosize from "react-textarea-autosize";

import Avatar from "Element/Avatar";
import Nip05 from "Element/Nip05";
import { hexToBech32 } from "Util";
import { MetadataCache } from "State/Users";
import { useQuery } from "State/Users/Hooks";

import messages from "./messages";

interface EmojiItemProps {
  name: string;
  char: string;
}

const EmojiItem = ({ entity: { name, char } }: { entity: EmojiItemProps }) => {
  return (
    <div className="emoji-item">
      <div className="emoji">{char}</div>
      <div className="emoji-name">{name}</div>
    </div>
  );
};

const UserItem = (metadata: MetadataCache) => {
  const { pubkey, display_name, nip05, ...rest } = metadata;
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
  );
};

interface TextareaProps {
  autoFocus: boolean;
  className: string;
  onChange(ev: React.ChangeEvent<HTMLTextAreaElement>): void;
  value: string;
  onFocus(): void;
}

const Textarea = (props: TextareaProps) => {
  const [query, setQuery] = useState("");
  const { formatMessage } = useIntl();

  const allUsers = useQuery(query);

  const userDataProvider = (token: string) => {
    setQuery(token);
    return allUsers ?? [];
  };

  const emojiDataProvider = (token: string) => {
    return emoji(token)
      .slice(0, 5)
      .map(({ name, char }) => ({ name, char }));
  };

  return (
    // @ts-expect-error If anybody can figure out how to type this, please do
    <ReactTextareaAutocomplete
      {...props}
      loadingComponent={() => <span>Loading...</span>}
      placeholder={formatMessage(messages.NotePlaceholder)}
      textAreaComponent={TextareaAutosize}
      trigger={{
        ":": {
          dataProvider: emojiDataProvider,
          component: EmojiItem,
          output: (item: EmojiItemProps) => item.char,
        },
        "@": {
          afterWhitespace: true,
          dataProvider: userDataProvider,
          component: (props: { entity: MetadataCache }) => (
            <UserItem {...props.entity} />
          ),
          output: (item: { pubkey: string }) =>
            `@${hexToBech32("npub", item.pubkey)}`,
        },
      }}
    />
  );
};

export default Textarea;
