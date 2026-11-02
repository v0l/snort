import { useState } from "react"
import { FormattedMessage } from "react-intl"

import DvmSelector from "@/Components/DvmSelector"
import Icon from "@/Components/Icons/Icon"
import usePreferences from "@/Hooks/usePreferences"
import { setPreference } from "@/Utils/Login"

import { AskSnortInput } from "@/Components/AskSnort/AskSnortInput"
import SearchBox from "@/Components/SearchBox/SearchBox"
import { TaskList } from "@/Components/Tasks/TaskList"
import { WorthALook } from "@/Components/WorthALook/WorthALook"
import useLogin from "@/Hooks/useLogin"

export default function RightColumn() {
  const { pubkey } = useLogin(s => ({ pubkey: s.publicKey }))
  const hideRightColumnPaths = ["/login", "/new", "/messages"]
  const show = !hideRightColumnPaths.some(path => globalThis.location.pathname.startsWith(path))
  const isAiChatPage = globalThis.location.pathname.startsWith("/agent")
  const [showDvmSelector, setShowDvmSelector] = useState(false)
  const currentProvider = usePreferences(s => s.trendingDvmPubkey)
  if (!show) return null

  return (
    <div className="flex flex-col w-full max-w-[460px] h-screen py-3 px-4 gap-4 overflow-y-auto hide-scrollbar">
      <SearchBox />
      {pubkey && !isAiChatPage && <AskSnortInput />}
      <TaskList />
      <section className="flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold m-0">
            <FormattedMessage defaultMessage="Worth a look" />
          </h2>
          {pubkey && (
            <button
              type="button"
              onClick={() => setShowDvmSelector(true)}
              className="plain p-1.5 rounded-lg text-neutral-400 hover:bg-layer-2"
              aria-label="Popular notes provider"
              title="Popular notes provider"
            >
              <Icon name="settings-02" size={18} />
            </button>
          )}
        </div>
        <WorthALook />
      </section>
      {showDvmSelector && (
        <DvmSelector
          kind={5300}
          onClose={() => setShowDvmSelector(false)}
          onSelect={p => {
            setPreference({ trendingDvmPubkey: p }).catch(console.error)
          }}
          currentProvider={currentProvider}
        />
      )}
    </div>
  )
}
