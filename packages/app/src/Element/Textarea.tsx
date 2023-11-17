import "@webscopeio/react-textarea-autocomplete/style.css";
import "./Textarea.css";

import { useIntl } from "react-intl";
import ReactTextareaAutocomplete from "@webscopeio/react-textarea-autocomplete";
import TextareaAutosize from "react-textarea-autosize";
import { NostrPrefix, MetadataCache } from "@snort/system";

import Avatar from "@/Element/User/Avatar";
import Nip05 from "@/Element/User/Nip05";
import { hexToBech32 } from "@/SnortUtils";
import { UserCache } from "@/Cache";
import searchEmoji from "@/emoji-search";

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
        <Avatar pubkey={pubkey} user={metadata} />
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
  placeholder?: string;
  onChange(ev: React.ChangeEvent<HTMLTextAreaElement>): void;
  value: string;
  onFocus(): void;
  onKeyDown(ev: React.KeyboardEvent<HTMLTextAreaElement>): void;
  onDragOver?(ev: React.DragEvent<HTMLTextAreaElement>): void;
  onDragLeave?(ev: React.DragEvent<HTMLTextAreaElement>): void;
  onDrop?(ev: React.DragEvent<HTMLTextAreaElement>): void;
}

const Textarea = (props: TextareaProps) => {
  const { formatMessage } = useIntl();

  const userDataProvider = async (token: string) => {
    return await UserCache.search(token);
  };

  const emojiDataProvider = async (token: string) => {
    return (await searchEmoji(token)).slice(0, 5).map(({ name, char }) => ({ name, char }));
  };

  return (
    // @ts-expect-error If anybody can figure out how to type this, please do
    <ReactTextareaAutocomplete
      dir="auto"
      {...props}
      loadingComponent={() => <span>Loading...</span>}
      placeholder={props.placeholder ?? formatMessage(messages.NotePlaceholder)}
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
          component: (props: { entity: MetadataCache }) => <UserItem {...props.entity} />,
          output: (item: { pubkey: string }) => `@${hexToBech32(NostrPrefix.PublicKey, item.pubkey)}`,
        },
      }}
    />
  );
};

export default Textarea;
