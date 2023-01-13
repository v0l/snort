import { useState, useEffect } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faSpinner, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

import './Nip05.css'

const Nip05 = ({ nip05, pubkey }) => {
    const [nip05pubkey, setNip05pubkey] = useState()
    const [couldNotVerify, setCouldNotVerify] = useState(false)
    const isVerified = nip05pubkey === pubkey
    const [name, domain] = nip05.split('@')
    const isDefaultUser = name === '_'

    useEffect(() => {
        setCouldNotVerify(false)
        fetch(`https://${domain}/.well-known/nostr.json?name=${name}`)
          .then((res) => res.json())
          .then(({ names }) => {
            if (names && names[name]) {
              setNip05pubkey(names[name])
            }
          })
          .catch((err) => {
            setCouldNotVerify(true)
            console.error("Couldn't verifiy nip05")
          })
    }, [nip05, name, domain])

    return (
       <div className="flex nip05" onClick={(ev) => ev.stopPropagation()}>
         {!isDefaultUser && <div className="nick">{name}</div>}
         <div className="domain" data-domain={domain}>
             {domain}
         </div>
         <span className="badge">
           {!isVerified && !couldNotVerify && (
               <FontAwesomeIcon
                 color={"var(--fg-color)"}
                 icon={faSpinner}
                 size="xs"
               />
           )}
           {isVerified && (
               <FontAwesomeIcon
                 color={"var(--success)"}
                 icon={faCheck}
                 size="xs"
               />
           )}
           {couldNotVerify && (
             <FontAwesomeIcon
               color={"var(--error)"}
               icon={faTriangleExclamation}
               size="xs"
             />
           )}
         </span>
       </div>
    )
}

export default Nip05
