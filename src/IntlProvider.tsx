import { type ReactNode } from 'react'
import { IntlProvider as ReactIntlProvider } from 'react-intl'
import enMessages from 'translations/en.json'
import esMessages from 'translations/es.json'

const DEFAULT_LOCALE = 'en-US'

const getMessages = (locale: string) => {
    const truncatedLocale = locale.toLowerCase().split(/[_-]+/)[0]

    switch (truncatedLocale) {
        case 'en':
            return enMessages
        case 'es':
            return esMessages
        default:
            return enMessages
    }
}

export const IntlProvider = ({ children }: { children: ReactNode }) => {
    const getLocale = () => {
        return (
            (navigator.languages && navigator.languages[0]) ||
            navigator.language ||
            DEFAULT_LOCALE
        )
    }
    const locale = getLocale()

    return (
        <ReactIntlProvider locale={locale} messages={getMessages(locale)}>
            {children}
        </ReactIntlProvider>
    )
}
