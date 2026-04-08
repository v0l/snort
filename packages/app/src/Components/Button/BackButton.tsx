import type { ReactNode } from "react"
import { FormattedMessage } from "react-intl"
import Icon from "@/Components/Icons/Icon"

interface BackButtonProps {
  text?: ReactNode
  onClick?(): void
}

export default function BackButton({ text, onClick }: BackButtonProps) {
  return (
    <button
      type="button"
      className="flex gap-2 items-center cursor-pointer hover:underline bg-transparent border-0 p-0 m-0"
      onClick={() => {
        onClick?.()
      }}
    >
      <Icon name="arrowBack" />
      <span>{text || <FormattedMessage defaultMessage="Back" />}</span>
    </button>
  )
}
