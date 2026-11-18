import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { dict, type Lang } from './dict'

export interface I18n {
  lang: Lang
  setLang: (l: Lang) => void
  /** Translate a key; falls back to English, then the key itself. */
  t: (key: string) => string
  /** Currency (IDR) formatted for the active locale, e.g. "Rp 8.000". */
  fmtMoney: (n: number) => string
  /** Number formatted for the active locale. */
  fmtNum: (n: number) => string
}

const LANG_KEY = 'ts5.lang'
const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    () => (localStorage.getItem(LANG_KEY) as Lang) || 'id',
  )

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(LANG_KEY, l)
    setLangState(l)
  }, [])

  const value = useMemo<I18n>(() => {
    const locale = lang === 'id' ? 'id-ID' : 'en-US'
    const money = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    })
    const num = new Intl.NumberFormat(locale)
    return {
      lang,
      setLang,
      t: (key) => dict[lang]?.[key] ?? dict.en[key] ?? key,
      fmtMoney: (n) => money.format(Number.isFinite(n) ? n : 0),
      fmtNum: (n) => num.format(Number.isFinite(n) ? n : 0),
    }
  }, [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider')
  return ctx
}
