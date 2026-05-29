import { useCallback, useEffect, useRef, useState } from "react"
import { useInView } from "react-intersection-observer"
import { FormattedMessage, useIntl } from "react-intl"
import NoteTime from "@/Components/Event/Note/NoteTime"
import messages from "@/Components/messages"
import Text from "@/Components/Text/Text"
import ProfileImage from "@/Components/User/ProfileImage"
import { type Chat, type ChatMessage, ChatType } from "@/chat"
import { getCachedDecryptedContent, setCachedDecryptedContent } from "@/Cache/GiftWrapCache"
import useEventPublisher from "@/Hooks/useEventPublisher"
import useLogin from "@/Hooks/useLogin"

export interface DMProps {
  chat: Chat
  data: ChatMessage
}

export default function DM(props: DMProps) {
  const { publicKey } = useLogin(s => ({ publicKey: s.publicKey }))
  const { publisher } = useEventPublisher()
  const msg = props.data
  const [content, setContent] = useState<string>(() => getCachedDecryptedContent(msg.id))
  const [decryptFailed, setDecryptFailed] = useState(false)
  const { ref, inView } = useInView({ triggerOnce: true })
  const { formatMessage } = useIntl()
  const isMe = msg.from === publicKey
  const otherPubkey = isMe ? publicKey : msg.from
  const msgRef = useRef(msg)
  msgRef.current = msg

  // biome-ignore lint/correctness/useExhaustiveDependencies: uses refs for stability
  const decrypt = useCallback(async () => {
    const m = msgRef.current
    if (publisher && !getCachedDecryptedContent(m.id)) {
      const decrypted = await m.decrypt(publisher)
      if (decrypted) {
        setCachedDecryptedContent(m.id, decrypted)
        setContent(decrypted)
        props.chat.markRead(m.id)
      } else {
        // Decryption failed — typically because this gift wrap is not
        // addressed to the local user (e.g. an outbound self-copy from
        // a NIP-17 dual-publish client) or has a malformed payload.
        // Don't cache the failure (so a future code path or session
        // can retry) and don't mark it read (so unread counts stay
        // accurate). Surface it as a subtle indicator instead of the
        // literal placeholder string "<ERROR>".
        setDecryptFailed(true)
      }
    }
  }, [publisher])

  function sender() {
    const isGroup = props.chat.type === ChatType.PrivateGroupChat || props.chat.type === ChatType.PublicGroupChat
    if (isGroup && !isMe) {
      return <ProfileImage pubkey={msg.from} />
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: only inView and content are real triggers
  useEffect(() => {
    if (inView && !content) {
      if (msg.needsDecryption) {
        decrypt().catch(console.error)
      } else {
        setContent(msg.content)
      }
    }
  }, [inView, content])

  return (
    <div
      className={
        isMe
          ? "self-end mt-4 min-w-[100px] max-w-[90%] whitespace-pre-wrap align-self-end"
          : "mt-4 min-w-[100px] max-w-[90%] whitespace-pre-wrap"
      }
      ref={ref}
    >
      <div
        className={
          isMe
            ? "p-3 bg-[image:var(--dm-gradient)] rounded-tl-lg rounded-tr-lg rounded-bl-lg rounded-rounded-lg-none"
            : "p-3 bg-layer-1 rounded-tl-lg rounded-tr-lg rounded-br-none rounded-bl-none"
        }
      >
        {sender()}
        {content ? (
          <Text id={msg.id} content={content} tags={[]} creator={otherPubkey} />
        ) : decryptFailed ? (
          <span className="italic text-gray-400">
            <FormattedMessage defaultMessage="Unable to decrypt message" />
          </span>
        ) : (
          <FormattedMessage defaultMessage="Loading..." />
        )}
      </div>
      <div className={isMe ? "text-end text-gray-400 text-sm mt-1" : "text-gray-400 text-sm mt-1"}>
        <NoteTime from={msg.created_at * 1000} fallback={formatMessage(messages.JustNow)} />
      </div>
    </div>
  )
}
