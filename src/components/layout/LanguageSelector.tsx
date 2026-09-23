import { useTranslation } from 'react-i18next'
import { localeStorageKey, type SupportedLocale } from '../../i18n/config'

export function LanguageSelector() {
  const { i18n, t } = useTranslation()
  function changeLanguage(language: SupportedLocale) {
    void i18n.changeLanguage(language)
    localStorage.setItem(localeStorageKey, language)
    document.documentElement.lang = language
  }
  return (
    <label className="block min-w-0 flex-1">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {t('common.language')}
      </span>
      <select
        value={i18n.language.startsWith('my') ? 'my' : 'en'}
        onChange={(event) => changeLanguage(event.target.value as SupportedLocale)}
        className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm"
      >
        <option value="en">English</option>
        <option value="my">မြန်မာ</option>
      </select>
    </label>
  )
}
