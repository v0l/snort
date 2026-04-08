import type React from "react"
import { type ReactNode, useEffect, useLayoutEffect, useRef } from "react"
import { createPortal } from "react-dom"

export interface ModalProps {
  id: string
  className?: string
  bodyClassName?: string
  onClose?: (e: React.MouseEvent | KeyboardEvent) => void
  onClick?: (e: React.MouseEvent) => void
  children?: ReactNode
}

let scrollbarWidth: number | null = null

const getScrollbarWidth = () => {
  if (scrollbarWidth !== null) {
    return scrollbarWidth
  }

  const outer = document.createElement("div")
  outer.style.visibility = "hidden"
  outer.style.width = "100px"

  document.body.appendChild(outer)

  const widthNoScroll = outer.offsetWidth
  outer.style.overflow = "scroll"

  const inner = document.createElement("div")
  inner.style.width = "100%"
  outer.appendChild(inner)

  const widthWithScroll = inner.offsetWidth

  outer.parentNode?.removeChild(outer)

  scrollbarWidth = widthNoScroll - widthWithScroll
  return scrollbarWidth
}

export default function Modal(props: ModalProps) {
  const onCloseRef = useRef(props.onClose)
  useLayoutEffect(() => {
    onCloseRef.current = props.onClose
  })

  useEffect(() => {
    document.body.classList.add("scroll-lock")
    document.body.style.paddingRight = `${getScrollbarWidth()}px`

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current?.(e)
      }
    }
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.classList.remove("scroll-lock")
      document.body.style.paddingRight = ""
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    props.onClose?.(e)
  }

  const handleBackdropKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleBackdropClick(e as unknown as React.MouseEvent)
    }
  }

  return createPortal(
    <button
      type="button"
      className={
        props.className === "hidden"
          ? props.className
          : `w-screen h-screen fixed top-0 left-0 bg-black/80 flex justify-center z-[42] overflow-y-auto ${props.className || ""}`
      }
      onMouseDown={handleBackdropClick}
      onClick={e => {
        e.stopPropagation()
        props.onClose?.(e)
      }}
      onKeyDown={handleBackdropKeyDown}
    >
      <div
        className={
          props.bodyClassName || "layer-1 px-6 py-4 flex flex-col my-auto lg:w-[720px] max-w-full max-h-[80dvh]"
        }
        onMouseDown={e => e.stopPropagation()}
        onClick={e => {
          e.stopPropagation()
        }}
      >
        {props.children}
      </div>
    </button>,
    document.body,
  )
}
