import "@webscopeio/react-textarea-autocomplete/style.css"
import "./Textarea.css"

import { NostrLink } from "@snort/system"
import ReactTextareaAutocomplete, { type ItemComponentProps } from "@webscopeio/react-textarea-autocomplete"
import type { ComponentType, TextareaHTMLAttributes } from "react"
import { useIntl } from "react-intl"
import TextareaAutosize from "react-textarea-autosize"

import Avatar from "@/Components/User/Avatar"
import type { FuzzySearchResult } from "@/Db/FuzzySearch"
import { useMentionSearch } from "@/Hooks/useProfileSearch"
import searchEmoji from "@/Utils/emoji-search"

import messages from "../messages"
import DisplayName from "../User/DisplayName"

export interface EmojiItemProps {
  name: string
  char: string
}

const EmojiItem = ({ entity: { name, char } }: { entity: EmojiItemProps }) => {
  return (
    <div className="flex flex-row items-center gap-2 !py-3 !px-4">
      <div className="min-w-4">{char}</div>
      <div className="font-bold">{name}</div>
    </div>
  )
}

const UserItem = (metadata: FuzzySearchResult) => {
  return (
    <div key={metadata.pubkey} className="flex flex-row items-center gap-2 !py-3 !px-4">
      <Avatar pubkey={metadata.pubkey} user={metadata} size={28} />
      <DisplayName pubkey={metadata.pubkey} user={metadata} />
    </div>
  )
}

interface TextareaProps {
  autoFocus: boolean
  className?: string
  placeholder?: string
  onChange(ev: React.ChangeEvent<HTMLTextAreaElement>): void
  value: string
  onFocus(): void
  onKeyDown(ev: React.KeyboardEvent<HTMLTextAreaElement>): void
  onDragOver?(ev: React.DragEvent<HTMLTextAreaElement>): void
  onDragLeave?(ev: React.DragEvent<HTMLTextAreaElement>): void
  onDrop?(ev: React.DragEvent<HTMLTextAreaElement>): void
}

type TriggerData = EmojiItemProps | FuzzySearchResult

const isEmoji = (item: TriggerData): item is EmojiItemProps => "char" in item

const EmojiTriggerItem = ({ entity }: ItemComponentProps<TriggerData>) =>
  isEmoji(entity) ? <EmojiItem entity={entity} /> : null

const UserTriggerItem = ({ entity }: ItemComponentProps<TriggerData>) =>
  isEmoji(entity) ? null : <UserItem {...entity} />

const AutosizeTextarea = TextareaAutosize as ComponentType<TextareaHTMLAttributes<HTMLTextAreaElement>>

const Textarea = (props: TextareaProps) => {
  const { formatMessage } = useIntl()
  const mentionSearch = useMentionSearch()

  const userDataProvider = async (token: string) => {
    return (await mentionSearch(token)).slice(0, 10)
  }

  const emojiDataProvider = async (token: string) => {
    return (await searchEmoji(token)).slice(0, 5).map(({ name, char }) => ({ name, char }))
  }

  return (
    <ReactTextareaAutocomplete<TriggerData>
      dir="auto"
      {...props}
      loadingComponent={() => <span>Loading...</span>}
      placeholder={props.placeholder ?? formatMessage(messages.NotePlaceholder)}
      textAreaComponent={AutosizeTextarea}
      trigger={{
        ":": {
          dataProvider: emojiDataProvider,
          component: EmojiTriggerItem,
          output: item => (isEmoji(item) ? item.char : ""),
        },
        "@": {
          afterWhitespace: true,
          dataProvider: userDataProvider,
          component: UserTriggerItem,
          output: item => (isEmoji(item) ? "" : `@${NostrLink.profile(item.pubkey).encode()}`),
        },
      }}
    />
  )
}

export default Textarea
