import { Nip46Signer, Nip7Signer, NotEncrypted, PrivateKeySigner } from "@snort/system"
import classNames from "classnames"
import { useState } from "react"
import { FormattedMessage, useIntl } from "react-intl"
import { Link, useNavigate } from "react-router-dom"

import AsyncButton from "@/Components/Button/AsyncButton"
import Icon from "@/Components/Icons/Icon"
import useLoginHandler from "@/Hooks/useLoginHandler"
import { trackEvent } from "@/Utils"
import { LoginSessionType, LoginStore } from "@/Utils/Login"

import { Bech32Regex, unwrap } from "@snort/shared"

const isAndroid = /Android/i.test(navigator.userAgent)

const NIP46_PERMS =
  "nip04_encrypt,nip04_decrypt,sign_event:0,sign_event:1,sign_event:3,sign_event:4,sign_event:6,sign_event:7,sign_event:30078"

export default function SignIn() {
  const navigate = useNavigate()
  const { formatMessage } = useIntl()
  const [key, setKey] = useState("")
  const [error, setError] = useState("")
  const [useKey, setUseKey] = useState(false)
  const loginHandler = useLoginHandler()

  const hasNip7 = "nostr" in window
  const hasNip46 = isAndroid

  async function doNip07Login() {
    setError("")
    try {
      const signer = new Nip7Signer()
      const pubKey = await signer.getPubKey()
      LoginStore.loginWithPubkey(pubKey, LoginSessionType.Nip7)
      trackEvent("Login", { type: "NIP7" })
      navigate("/")
    } catch (e) {
      setError(e instanceof Error ? e.message : formatMessage({ defaultMessage: "Unknown login error", id: "OLEm6z" }))
    }
  }

  async function doNip46Login() {
    setError("")
    try {
      const clientSigner = PrivateKeySigner.random()
      const clientPubkey = await clientSigner.getPubKey()
      const secret = crypto.randomUUID().replace(/-/g, "")
      const relay = Object.keys(CONFIG.defaultRelays)[0]
      const connectUrl = `nostrconnect://${clientPubkey}?relay=${encodeURIComponent(relay)}&secret=${secret}&perms=${NIP46_PERMS}`

      const nip46 = new Nip46Signer(connectUrl, clientSigner)

      const onVisible = () => {
        if (document.visibilityState === "visible") {
          globalThis.location.href = connectUrl
        }
      }
      document.addEventListener("visibilitychange", onVisible)

      const relayReady = new Promise<void>(resolve => {
        nip46.once("ready", () => resolve())
      })
      const initPromise = nip46.init()

      await relayReady
      globalThis.location.href = connectUrl

      await initPromise
      document.removeEventListener("visibilitychange", onVisible)

      const loginPubkey = await nip46.getPubKey()
      LoginStore.loginWithPubkey(
        loginPubkey,
        LoginSessionType.Nip46,
        undefined,
        nip46.relays,
        new NotEncrypted(unwrap(nip46.privateKey)),
      )
      nip46.close()
      trackEvent("Login", { type: "NIP46" })
      navigate("/")
    } catch (e) {
      setError(e instanceof Error ? e.message : formatMessage({ defaultMessage: "Unknown login error", id: "OLEm6z" }))
    }
  }

  async function onSubmit(e: Event) {
    e.preventDefault()
    doLogin(key)
  }

  async function doLogin(key: string) {
    setError("")
    try {
      await loginHandler.doLogin(key, key => Promise.resolve(new NotEncrypted(key)))
      trackEvent("Login", { type: "Key" })
      navigate("/")
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message)
      } else {
        setError(
          formatMessage({
            defaultMessage: "Unknown login error",
            id: "OLEm6z",
          }),
        )
      }
      console.error(e)
    }
  }

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val.match(Bech32Regex)) {
      doLogin(val)
    } else {
      setKey(val)
    }
  }

  const signerExtLogin = (hasNip7 || hasNip46) && !useKey
  return (
    <div className="flex flex-col gap-6">
      <img src={CONFIG.icon} width={48} height={48} className="rounded-lg mr-auto ml-auto" alt="" />
      <div className="flex flex-col gap-4 items-center">
        <h1>
          <FormattedMessage defaultMessage="Sign In" />
        </h1>
        {signerExtLogin && <FormattedMessage defaultMessage="Use a nostr signer extension to sign in" />}
      </div>
      {error && <b className="text-error">{error}</b>}
      <div className={classNames("flex flex-col gap-4", { "items-center": signerExtLogin })}>
        {signerExtLogin && (
          <>
            {hasNip7 && (
              <AsyncButton onClick={doNip07Login}>
                <div className="rounded-full bg-warning p-3 text-white">
                  <Icon name="key" />
                </div>
                <FormattedMessage defaultMessage="Sign in with Nostr Extension" />
              </AsyncButton>
            )}
            {hasNip46 && (
              <AsyncButton onClick={doNip46Login}>
                <div className="rounded-full bg-warning p-3 text-white">
                  <Icon name="key" />
                </div>
                <FormattedMessage defaultMessage="Sign in with Nostr Connect" />
              </AsyncButton>
            )}
            <Link to="" className="highlight">
              <FormattedMessage defaultMessage="Supported Extensions" />
            </Link>
            <AsyncButton onClick={() => setUseKey(true)}>
              <FormattedMessage defaultMessage="Sign in with key" />
            </AsyncButton>
          </>
        )}
        {(!signerExtLogin || useKey) && (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder={formatMessage({
                defaultMessage: "nsec, npub, nip-05, hex, mnemonic",
              })}
              value={key}
              onChange={onChange}
              className="new-username"
            />
            <div className="flex justify-center">
              <AsyncButton onClick={onSubmit} className="primary">
                <FormattedMessage defaultMessage="Login" />
              </AsyncButton>
            </div>
          </form>
        )}
      </div>
      <div className="flex flex-col gap-4 items-center">
        <Link to={"/login/sign-up"}>
          <FormattedMessage defaultMessage="Don't have an account?" />
        </Link>
        <AsyncButton className="secondary" onClick={() => navigate("/login/sign-up")}>
          <FormattedMessage defaultMessage="Sign Up" />
        </AsyncButton>
      </div>
    </div>
  )
}
