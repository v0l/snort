import { useCallback, useEffect, useRef, useState } from 'react'

interface HoveringProps {
  enterTimeout?: number
  leaveTimeout?: number
}

export default function useHovering<T extends HTMLElement>(props?: HoveringProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const elmRef = useRef<T>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

  const updatePosition = useCallback(() => {
    if (elmRef.current) {
      const rect = elmRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      })
    }
  }, [])

  const isHoveringRef = useRef(false)

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current || isHoveringRef.current) return
    hoverTimeoutRef.current = setTimeout(() => {
      isHoveringRef.current = true
      setIsHovering(true)
      updatePosition()
      hoverTimeoutRef.current = null
    }, props?.enterTimeout ?? 100)
  }, [props?.enterTimeout, updatePosition])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current || !isHoveringRef.current) return
    hoverTimeoutRef.current = setTimeout(() => {
      isHoveringRef.current = false
      setIsHovering(false)
      hoverTimeoutRef.current = null
    }, props?.leaveTimeout ?? 500)
  }, [props?.leaveTimeout])

  useEffect(() => {
    const el = elmRef.current
    if (el) {
      el.addEventListener('mouseenter', handleMouseEnter)
      el.addEventListener('mouseleave', handleMouseLeave)
      return () => {
        el.removeEventListener('mouseenter', handleMouseEnter)
        el.removeEventListener('mouseleave', handleMouseLeave)
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current)
          hoverTimeoutRef.current = null
        }
      }
    }
  }, [handleMouseEnter, handleMouseLeave])

  return { isHovering, elmRef, position }
}
