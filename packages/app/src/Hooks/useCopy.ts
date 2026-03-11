import { useEffect, useRef, useState } from 'react'

export const useCopy = (timeout = 2000) => {
  const [error, setError] = useState(false)
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const copy = async (text: string) => {
    setError(false)
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'absolute'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        await document.execCommand('copy')
        textArea.remove()
      }
      setCopied(true)
    } catch (error) {
      setError(true)
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), timeout)
  }

  return { error, copied, copy }
}
