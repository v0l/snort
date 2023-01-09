import { useState, useEffect } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";

import './Nip05.css'

const Nip05 = ({ nip05, pubkey }) => {
    const [nip05pubkey, setNip05pubkey] = useState()
    const isVerified = nip05pubkey === pubkey
    const [nick, domain] = nip05.split('@')

    useEffect(() => {
        fetch(`https://${domain}/.well-known/nostr.json`)
          .then((res) => res.json())
          .then(({ names }) => {
            if (names && names[nick]) {
              setNip05pubkey(names[nick])
            }
          })
          .catch((err) => {
            console.error("Couldn't verifiy nip05")
          })
    }, [nip05, nick, domain])

    return (
       <div className="flex nip05">
         <div className="nick">{nick}</div>
         <div className="domain">@{domain}</div>
         {isVerified && (
           <span className="badge">
             <FontAwesomeIcon
               color={"green"}
               icon={faCheck}
               size="xs"
             />
           </span>
         )}
       </div>
    )
}

export default Nip05
