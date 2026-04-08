import { useEffect, useMemo, useRef, useState } from "react"
import { FormattedMessage } from "react-intl"

import { type Chat, useChat } from "@/chat"
import ProfileImage from "@/Components/User/ProfileImage"
import DM from "@/Pages/Messages/DM"
import WriteMessage from "@/Pages/Messages/WriteMessage"

import { ChatParticipantProfile } from "./ChatParticipant"

export default function DmWindow({ id }: { id: string }) {
  const chat = useChat(id)
  const containerRef = useRef<HTMLDivElement>(null)
  const [topOffset, setTopOffset] = useState(0)

  useEffect(() => {
    const update = () => {
      const header = document.querySelector("header")
      setTopOffset(header?.getBoundingClientRect().height ?? 0)
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

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
    <div
      ref={containerRef}
      className="flex flex-1 flex-col min-h-0 w-full fixed left-0 right-0 bottom-0 md:relative md:left-auto md:right-auto md:bottom-auto z-10 md:z-auto bg-background"
      style={{ top: `${topOffset}px` }}
    >
      <div className="p-3">{sender()}</div>
      <div className="overflow-y-auto hide-scrollbar p-2.5 flex-grow">{chat && <DmChatSelected chat={chat} />}</div>
      <div className="flex items-center gap-2.5 p-2.5">{chat && <WriteMessage chat={chat} />}</div>
    </div>
  )
}

function DmChatSelected({ chat }: { chat: Chat }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const sortedDms = useMemo(() => {
    const myDms = chat?.messages
    if (myDms) {
      return [...myDms].sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
    }
    return []
  }, [chat])

  // biome-ignore lint/correctness/useExhaustiveDependencies: sortedDms is the trigger for scrolling to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [sortedDms])

  return (
    <div ref={scrollRef} className="flex flex-col-reverse">
      {sortedDms.map(a => (
        <DM data={a} key={a.id} chat={chat} />
      ))}
    </div>
  )
}
