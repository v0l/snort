import { type ReactNode, useEffect, useState } from "react"

export function FixedPage({ children, className }: { children?: ReactNode, className?: string }) {
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


    return <div
        className={`${className} min-h-0 min-w-0 w-full fixed md:relative bg-background overflow-hidden`}
        style={{ height: `calc(100dvh - ${topOffset}px)` }}
    >
        {children}
    </div>
}