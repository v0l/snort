import { FormattedMessage } from "react-intl"
import { Link } from "react-router-dom"

import Telegram from "@/assets/img/telegram.svg"
import AsyncButton from "@/Components/Button/AsyncButton"
import ZapButton from "@/Components/Event/ZapButton"
import ProfilePreview from "@/Components/User/ProfilePreview"
import { Contributors, DonateLNURL, Translators } from "@/Pages/Donate/const"
import { ZapPoolDonateSection } from "@/Pages/Donate/ZapPoolDonateSection"
import { KieranPubKey } from "@/Utils/Const"
import { bech32ToHex } from "@snort/shared"

const DonatePage = () => {
  return (
    <div className="px-3 py-2 flex flex-col gap-2">
      <div>
        <FormattedMessage
          defaultMessage="{app} is an open source project built by passionate people in their free time, your donations are greatly appreciated"
          values={{
            app: CONFIG.appNameCapitalized,
          }}
        />
      </div>
      <div>
        <FormattedMessage
          defaultMessage="Check out the code {link}"
          id="LKw/ue"
          values={{
            link: (
              <a className="highlight underline" href="https://github.com/v0l/snort" rel="noreferrer" target="_blank">
                here
              </a>
            ),
          }}
        />
      </div>
      <div>
        <FormattedMessage
          defaultMessage="To see a full list of changes you can view the changelog {here}"
          values={{
            here: (
              <Link to="/changelog" className="highlight underline">
                <FormattedMessage defaultMessage="here" />
              </Link>
            ),
          }}
        />
      </div>
      {CONFIG.chatChannels && CONFIG.chatChannels.length > 0 && (
        <>
          <h4>
            <FormattedMessage defaultMessage="Public Chat Channels" />
          </h4>
          <div className="flex gap-2">
            {CONFIG.chatChannels.map(a => {
              switch (a.type) {
                case "telegram": {
                  return (
                    <AsyncButton
                      onClick={() => {
                        window.open(a.value, "_blank", "noreferrer")
                      }}
                    >
                      <img src={Telegram} width={24} height={24} />
                      <FormattedMessage defaultMessage="Telegram" />
                    </AsyncButton>
                  )
                }
              }
            })}
          </div>
        </>
      )}
      <h3>
        <FormattedMessage defaultMessage="Donate" />
      </h3>
      <div className="layer-1">
        <div className="flex items-center justify-between">
          <FormattedMessage defaultMessage="Lightning Donation" />
          <ZapButton pubkey={bech32ToHex(KieranPubKey)} lnurl={DonateLNURL}>
            <FormattedMessage defaultMessage="Donate" />
          </ZapButton>
        </div>
      </div>
      <ZapPoolDonateSection />
      <h2>
        <FormattedMessage defaultMessage="Contributors" />
      </h2>
      {Contributors.map(a => (
        <ProfilePreview pubkey={a} key={a} />
      ))}
      <h2>
        <FormattedMessage defaultMessage="Translators" />
      </h2>
      {Translators.map(a => (
        <ProfilePreview pubkey={a} key={a} />
      ))}
    </div>
  )
}

export default DonatePage
