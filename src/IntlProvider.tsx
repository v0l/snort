import { type ReactNode } from 'react'
import { IntlProvider as ReactIntlProvider } from 'react-intl'

const DEFAULT_LOCALE = 'en-US'
const enMessages = {
    hello: 'hello',
}

const esMessages = {
    hello: 'hola',
}

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
        if (typeof navigator === 'undefined') {
            return DEFAULT_LOCALE
        }

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
