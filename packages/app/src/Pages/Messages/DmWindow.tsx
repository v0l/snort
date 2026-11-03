import { Fragment, useEffect, useMemo, useRef } from "react"
import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router-dom"

import { type Chat, useChat } from "@/chat"
import ProfileImage from "@/Components/User/ProfileImage"
import DM from "@/Pages/Messages/DM"
import { continuesRun, sortMessages, startsNewDay } from "@/Pages/Messages/chatList"
import WriteMessage from "@/Pages/Messages/WriteMessage"

import { ChatParticipantProfile } from "./ChatParticipant"
import { FixedPage } from "../FixedPage"

export default function DmWindow({ id }: { id: string }) {
  const chat = useChat(id)
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      })
    }
  }, [chat?.messages])

  function sender() {
    if (!chat) return
    if (chat.participants.length === 1) {
      return <ChatParticipantProfile participant={chat.participants[0]} />
    } else {
      return (
        <div className="flex -space-x-5 mb-2.5">
          {chat.participants.map(v => (
            <ProfileImage key={v.id} pubkey={v.id} showUsername={false} />
          ))}
          {chat.title ?? <FormattedMessage defaultMessage="Secret Group Chat" />}
        </div>
      )
    }
  }

  return (
    <FixedPage className="flex flex-1 flex-col">
      <div className="p-3 flex items-center gap-2">
        <button type="button" className="md:hidden" onClick={() => navigate("/messages")}>
          <FormattedMessage defaultMessage="Back" />
        </button>
        {sender()}
      </div>
      <div ref={scrollRef} className="overflow-y-auto hide-scrollbar p-2.5 flex-grow min-w-0">
        {chat && <DmChatSelected chat={chat} />}
      </div>
      <div className="flex items-center gap-2.5 p-2.5 shrink-0">{chat && <WriteMessage chat={chat} />}</div>
    </FixedPage>
  )
}

function DmChatSelected({ chat }: { chat: Chat }) {
  const sortedDms = useMemo(() => sortMessages(chat?.messages ?? []), [chat])

  return (
    <div className="flex flex-col">
      {sortedDms.length === 0 && (
        <div className="text-neutral-400 text-center p-4">
          <FormattedMessage defaultMessage="No messages yet. Say hello!" />
        </div>
      )}
      {sortedDms.map((a, i) => (
        <Fragment key={a.id}>
          {startsNewDay(sortedDms, i) && (
            <div className="text-center text-xs text-neutral-400 mt-4">
              {new Date(a.created_at * 1000).toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          )}
          <DM data={a} chat={chat} grouped={continuesRun(sortedDms, i)} />
        </Fragment>
      ))}
    </div>
  )
}
