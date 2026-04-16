import { useEffect, useMemo, useRef, useState } from "react"
import { FormattedMessage } from "react-intl"

import { type Chat, useChat } from "@/chat"
import ProfileImage from "@/Components/User/ProfileImage"
import DM from "@/Pages/Messages/DM"
import WriteMessage from "@/Pages/Messages/WriteMessage"

import { ChatParticipantProfile } from "./ChatParticipant"
import { FixedPage } from "../FixedPage"

export default function DmWindow({ id }: { id: string }) {
  const chat = useChat(id)
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
    <FixedPage className="flex flex-1 flex-col" >
      <div className="p-3">{sender()}</div>
      <div ref={scrollRef} className="overflow-y-auto hide-scrollbar p-2.5 flex-grow min-w-0">
        {chat && <DmChatSelected chat={chat} />}
      </div>
      <div className="flex items-center gap-2.5 p-2.5 shrink-0">{chat && <WriteMessage chat={chat} />}</div>
    </FixedPage>
  )
}

function DmChatSelected({ chat }: { chat: Chat }) {
  const sortedDms = useMemo(() => {
    const myDms = chat?.messages
    if (myDms) {
      return [...myDms].sort((a, b) => (a.created_at > b.created_at ? 1 : -1))
    }
    return []
  }, [chat])

  return (
    <div className="flex flex-col">
      {sortedDms.map(a => (
        <DM data={a} key={a.id} chat={chat} />
      ))}
    </div>
  )
}
