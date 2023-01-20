import "./Avatar.css";
import Nostrich from "../nostrich.jpg";
import { CSSProperties } from "react";
import type { UserMetadata } from "Nostr";


const Avatar = ({ user, ...rest }: { user?: UserMetadata, onClick?: () => void}) => {
    const avatarUrl = (user?.picture?.length ?? 0) === 0 ? Nostrich : user?.picture
    const backgroundImage = `url(${avatarUrl})`
    const domain = user?.nip05 && user.nip05.split('@')[1]
    const style = { '--img-url': backgroundImage } as CSSProperties
    return (
        <div
          {...rest}
          style={style}
          className="avatar"
          data-domain={domain?.toLowerCase()}
        >
        </div>
    )
}

export default Avatar
