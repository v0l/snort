import { useQuery } from "react-query";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faSpinner, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

import './Nip05.css'

function fetchNip05Pubkey(name, domain) {
  if (!name || !domain) {
    return Promise.resolve(null)
  }
  return fetch(`https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(name)}`)
        .then((res) => res.json())
        .then(({ names }) => {
          const match = Object.keys(names).find(n => {
            return n.toLowerCase() === name.toLowerCase()
          })
          return names[match]
        })
}

const VERIFICATION_CACHE_TIME = 24 * 60 * 60 * 1000
const VERIFICATION_STALE_TIMEOUT = 10 * 60 * 1000

export function useIsVerified(nip05, pubkey) {
  const [name, domain] = nip05 ? nip05.split('@') : []
  const address = domain && `${name}@${domain.toLowerCase()}`
  const { isLoading, isError, isSuccess, isIdle, data } = useQuery(
    ['nip05', nip05],
    () => fetchNip05Pubkey(name, domain),
    {
      retry: false,
      cacheTime: VERIFICATION_CACHE_TIME,
      staleTime: VERIFICATION_STALE_TIMEOUT
    },
  )
  const isVerified = isSuccess && data === pubkey
  const cantVerify = isSuccess && data !== pubkey
  return { isVerified, couldNotVerify: isError || cantVerify }
}

const Nip05 = ({ nip05, pubkey }) => {
    const [name, domain] = nip05 ? nip05.split('@') : []
    const isDefaultUser = name === '_'
    const { isVerified, couldNotVerify } = useIsVerified(nip05, pubkey)

    return (
       <div className="flex nip05" onClick={(ev) => ev.stopPropagation()}>
         <div className="nick">
            {!isDefaultUser && name}
          </div>
         <div className={`domain text-gradient`} data-domain={domain?.toLowerCase()}>
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
