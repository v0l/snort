import { useState, useEffect } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faSpinner, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

import './Nip05.css'

export function useIsVerified(nip05, pubkey) {
  const [isVerified, setIsVerified] = useState(false)
  const [couldNotVerify, setCouldNotVerify] = useState(false)
  const [name, domain] = nip05 ? nip05.split('@') : []

  useEffect(() => {
      if (!nip05 || !pubkey) {
        return
      }
      setCouldNotVerify(false)
      setIsVerified(false)

      fetch(`https://${domain}/.well-known/nostr.json?name=${name}`)
        .then((res) => res.json())
        .then(({ names }) => {
          if (names && names[name]) {
            setIsVerified(names[name] === pubkey)
          }
        })
        .catch((err) => {
          setCouldNotVerify(true)
          console.error("Couldn't verifiy nip05")
        })
  }, [nip05, pubkey])

  return { name, domain: domain?.toLowerCase(), isVerified, couldNotVerify }
}

const Nip05 = ({ name, domain, isVerified, couldNotVerify }) => {
    const isDefaultUser = name === '_'

    return (
       <div className="flex nip05" onClick={(ev) => ev.stopPropagation()}>
         {!isDefaultUser && <div className="nick">{name}</div>}
         <div className="domain" data-domain={isVerified ? domain : ''}>
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
