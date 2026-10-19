import { ThreeSpeakRegex } from "@/Utils/Const"

export default function ThreeSpeakEmbed({ link }: { link: string }) {
  const m = link.match(ThreeSpeakRegex)
  if (!m) return

  const [, type, author, permlink] = m
  return (
    <iframe
      className={type === "shorts" ? "mx-auto aspect-[9/16] w-full max-w-sm" : "aspect-video w-full"}
      src={`https://play.3speak.tv/watch?v=${author}/${permlink}&mode=iframe`}
      title="3Speak video player"
      frameBorder="0"
      allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen={true}
      loading="lazy"
    />
  )
}
