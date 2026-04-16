import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { FormattedMessage, useIntl } from "react-intl"

import { AsyncIcon } from "@/Components/Button/AsyncIcon"
import Textarea from "@/Components/Textarea/Textarea"
import Icon from "@/Components/Icons/Icon"

export function AskSnortInput() {
  const navigate = useNavigate()
  const [input, setInput] = useState("")
  const { formatMessage } = useIntl();

  function handleSubmit() {
    if (!input.trim()) return
    navigate("/agent", { state: { initialMessage: input } })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      handleSubmit()
    }
  }

  return (
    <div className="p-3 bg-layer-1 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Icon name="lightbulb" className="text-primary flex-shrink-0" size={16} />
        <span className="font-semibold text-sm flex-shrink-0">
          <FormattedMessage defaultMessage="Ask {appName} AI" values={{ appName: CONFIG.appNameCapitalized }} />
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <Textarea
            autoFocus={false}
            placeholder={formatMessage({ defaultMessage: "Try: Summarize my timeline" })}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { }}
            className="!border-0 !resize-none !p-2 !bg-transparent !text-sm min-h-[32px] max-h-[48px] overflow-hidden"
          />
        </div>
        <AsyncIcon
          className="rounded-full flex items-center button shrink-0"
          iconName="arrow-right"
          onClick={handleSubmit}
          disabled={!input.trim()}
        />
      </div>
    </div>
  )
}
