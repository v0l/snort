import "@webscopeio/react-textarea-autocomplete/style.css";
import "./Textarea.css";

import { NostrLink } from "@snort/system";
import ReactTextareaAutocomplete from "@webscopeio/react-textarea-autocomplete";
import { useIntl } from "react-intl";
import TextareaAutosize from "react-textarea-autosize";

import Avatar from "@/Components/User/Avatar";
import Nip05 from "@/Components/User/Nip05";
import { FuzzySearchResult } from "@/Db/FuzzySearch";
import useProfileSearch from "@/Hooks/useProfileSearch";
import searchEmoji from "@/Utils/emoji-search";

import messages from "../messages";

export interface EmojiItemProps {
  name: string;
  char: string;
}

const EmojiItem = ({ entity: { name, char } }: { entity: EmojiItemProps }) => {
  return (
    <div className="emoji-item text-[11px] text-font-color bg-neutral-900 flex flex-row items-center p-2.5 hover:bg-neutral-700">
      <div className="emoji mr-1 min-w-[20px]">{char}</div>
      <div className="emoji-name font-bold">{name}</div>
    </div>
  );
};

const UserItem = (metadata: FuzzySearchResult) => {
  const { pubkey, display_name, nip05, ...rest } = metadata;
  return (
    <div
      key={pubkey}
      className="user-item text-font-color bg-neutral-900 flex flex-row items-center text-base p-2.5 hover:bg-neutral-700">
      <div className="user-picture flex items-center justify-center mr-2">
        <Avatar pubkey={pubkey} user={metadata} />
      </div>
      <div className="user-details flex flex-col items-start">
        <strong>{display_name || rest.name}</strong>
        <Nip05 nip05={nip05} pubkey={pubkey} />
      </div>
    </div>
  );
};

interface TextareaProps {
  autoFocus: boolean;
  className?: string;
  placeholder?: string;
  onChange(ev: React.ChangeEvent<HTMLTextAreaElement>): void;
  value: string;
  onFocus(): void;
  onKeyDown(ev: React.KeyboardEvent<HTMLTextAreaElement>): void;
  onDragOver?(ev: React.DragEvent<HTMLTextAreaElement>): void;
  onDragLeave?(ev: React.DragEvent<HTMLTextAreaElement>): void;
  onDrop?(ev: React.DragEvent<HTMLTextAreaElement>): void;
}

type TriggerData = EmojiItemProps | FuzzySearchResult;

const Textarea = (props: TextareaProps) => {
  const { formatMessage } = useIntl();
  const userSearch = useProfileSearch();

  const userDataProvider = (token: string) => {
    return userSearch(token).slice(0, 10);
  };

  const emojiDataProvider = async (token: string) => {
    return (await searchEmoji(token)).slice(0, 5).map(({ name, char }) => ({ name, char }));
  };

  return (
    // @ts-ignore 2769
    <ReactTextareaAutocomplete<TriggerData>
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
          component: (props: { entity: FuzzySearchResult }) => <UserItem {...props.entity} />,
          output: (item: { pubkey: string }) => `@${NostrLink.profile(item.pubkey).encode()}`,
        },
      }}
    />
  );
};

export default Textarea;
