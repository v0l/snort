import { useState } from "react"

import Icon from "../Icons/Icon"
import { ProxyImg } from "../ProxyImg"

export default function GenericPlayer({ url, poster }: { url: string; poster: string }) {
  const [play, setPlay] = useState(false)

  if (!play) {
    return (
      <button
        type="button"
        className="relative aspect-video cursor-pointer bg-transparent border-0 p-0 m-0"
        onClick={e => {
          e.preventDefault()
          e.stopPropagation()
          setPlay(true)
        }}
      >
        <ProxyImg className="absolute" src={poster} />
        <div className="absolute w-full h-full opacity-0 hover:opacity-100 hover:bg-black/30 flex items-center justify-center transition">
          <Icon name="play-square-outline" size={50} />
        </div>
      </button>
    )
  }
  return (
    <iframe
      title="Generic Video Player"
      className="aspect-video w-full"
      src={url}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen={true}
    />
  )
}
