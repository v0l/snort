import classNames from "classnames"
import type React from "react"
import { useMemo, useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { useNavigate, useParams } from "react-router-dom"

import { type Chat, type ChatType, useChatSystems } from "@/chat"
import { getCachedDecryptedContent } from "@/Cache/GiftWrapCache"
import { CollapsedSection } from "@/Components/Collapsed"
import NoteTime from "@/Components/Event/Note/NoteTime"
import NoteToSelf from "@/Components/User/NoteToSelf"
import ProfileImage from "@/Components/User/ProfileImage"
import useLogin from "@/Hooks/useLogin"
import usePageDimensions from "@/Hooks/usePageDimensions"
import useWoT from "@/Hooks/useWoT"
import { ChatParticipantProfile } from "@/Pages/Messages/ChatParticipant"
import DmWindow from "@/Pages/Messages/DmWindow"
import NewChatWindow from "@/Pages/Messages/NewChatWindow"
import { matchesQuery, previewText, splitChats } from "@/Pages/Messages/chatList"
import UnreadCount from "@/Pages/Messages/UnreadCount"

const TwoCol = 768

export default function MessagesPage() {
  const login = useLogin()
  const { formatMessage } = useIntl()
  const navigate = useNavigate()
  const { id } = useParams()
  const { width: pageWidth } = usePageDimensions()

  const chats = useChatSystems()
  const wot = useWoT()
  const myPubkey = login.publicKey
  const [query, setQuery] = useState("")
  const visibleChats = useMemo(
    () =>
      chats.filter(c =>
        matchesQuery(
          [c.title, ...c.participants.flatMap(p => [p.id, p.profile?.name, p.profile?.display_name, p.profile?.nip05])],
          query,
        ),
      ),
    [chats, query],
  )
  const { trusted: trustedChats, other: otherChats } = splitChats(visibleChats, myPubkey, p => wot.followDistance(p))

  const unreadTrustedCount = useMemo(() => trustedChats.reduce((p, c) => p + c.unread, 0), [trustedChats])
  const unreadOtherCount = useMemo(() => otherChats.reduce((p, c) => p + c.unread, 0), [otherChats])

  function openChat(e: React.MouseEvent<HTMLDivElement>, _type: ChatType, id: string) {
    e.stopPropagation()
    e.preventDefault()
    navigate(`/messages/${encodeURIComponent(id)}`)
  }

  function noteToSelf(chat: Chat) {
    return (
      <div className="flex px-3 py-2" key={chat.id} onClick={e => openChat(e, chat.type, chat.id)}>
        <NoteToSelf className="grow" />
      </div>
    )
  }

  function conversationIdent(cx: Chat) {
    if (cx.participants.length === 1) {
      return <ChatParticipantProfile participant={cx.participants[0]} />
    } else {
      return (
        <div className="flex items-center grow pfp-overlap min-w-0">
          {cx.participants.map(v => (
            <ProfileImage key={v.id} pubkey={v.id} link="" showUsername={false} profile={v.profile} />
          ))}
          {cx.title ?? <FormattedMessage defaultMessage="Group Chat" />}
        </div>
      )
    }
  }

  function lastPreview(cx: Chat) {
    const last = cx.messages.reduce<Chat["messages"][number] | undefined>(
      (best, m) => (!best || m.created_at > best.created_at ? m : best),
      undefined,
    )
    if (!last) return ""
    const text = previewText(getCachedDecryptedContent(last.id) ?? last.content)
    if (!text) return ""
    return last.from === myPubkey ? `${formatMessage({ defaultMessage: "You" })}: ${text}` : text
  }

  function conversation(cx: Chat) {
    if (!login.publicKey) return null
    const participants = cx.participants.map(a => a.id)
    if (participants.length === 1 && participants[0] === login.publicKey) return noteToSelf(cx)

    const isActive = cx.id === id
    return (
      <div
        className={classNames("flex items-center px-3 py-2 cursor-pointer justify-between", { active: isActive })}
        key={cx.id}
        onClick={e => openChat(e, cx.type, cx.id)}
      >
        <div className="flex flex-col min-w-0 grow">
          {conversationIdent(cx)}
          <small className="text-neutral-400 truncate">{lastPreview(cx)}</small>
        </div>
        <div className="whitespace-nowrap">
          <small>
            <NoteTime
              from={cx.lastMessage * 1000}
              fallback={formatMessage({ defaultMessage: "Just now", id: "bxv59V" })}
            />
          </small>
          {cx.unread > 0 && <UnreadCount unread={cx.unread} />}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {(pageWidth >= TwoCol || !id) && (
        <div className="overflow-y-auto p-2 w-full md:w-1/3 flex-shrink-0 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <button
              disabled={unreadTrustedCount <= 0}
              type="button"
              className="text-sm font-semibold"
              onClick={() => {
                for (const c of chats) c.markRead()
              }}
            >
              <FormattedMessage defaultMessage="Mark all read" />
            </button>
            <NewChatWindow />
          </div>
          <input
            type="search"
            className="w-full"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={formatMessage({ defaultMessage: "Search chats" })}
          />
          {visibleChats.length === 0 && (
            <div className="text-neutral-400 text-center p-4">
              {query ? (
                <FormattedMessage defaultMessage="No chats match your search" />
              ) : (
                <FormattedMessage defaultMessage="No messages yet. Start a new chat to say hello." />
              )}
            </div>
          )}
          {trustedChats.map(conversation)}
          {otherChats.length > 0 && (
            <CollapsedSection
              title={
                <div className="text-xl flex items-center gap-4">
                  <FormattedMessage defaultMessage="Other Chats" />
                  {unreadOtherCount > 0 && <div className="has-unread" />}
                </div>
              }
            >
              {otherChats.map(conversation)}
            </CollapsedSection>
          )}
        </div>
      )}
      {id ? <DmWindow id={id} /> : pageWidth >= TwoCol && <div className="flex-1 rt-border"></div>}
    </div>
  )
}
