/**
 * The app's UI language and message lookup.
 *
 * Messages live in `messages/<language>.ts`, keyed by stable ids. `t` reads
 * the current language synchronously, so plain functions (services, stores)
 * can use it too; changing the language persists the choice and reloads the
 * app (`stores/settings-store`), which re-renders everything — including
 * memoized rows — in the new language.
 *
 * Only UI copy is translated. Task text, notes, people and tags are the
 * user's own words and never pass through here.
 */
import {
  DEFAULT_LANGUAGE_PREFERENCE,
  ENGLISH_LANGUAGE,
  isLanguage,
  isLanguagePreference,
  languageForPreference,
  type Language,
  type LanguagePreference,
} from '../models/language'
import { en, type MessageKey } from './messages/en'
import { zhCN } from './messages/zh-CN'

export type { MessageKey }

/** A message parameter: `{name}` in the copy is replaced with its value. */
export type MessageParams = Record<string, string | number>

/** Where the preference is mirrored for the synchronous read before the database opens. */
const LANGUAGE_STORAGE_KEY = 'todo2.language'

function browserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return []
  const languages = navigator.languages
  if (languages && languages.length > 0) return languages
  return navigator.language ? [navigator.language] : []
}

/** The exact language to show, from the stored preference and the browser. */
export function resolveInitialLanguage(
  preference: LanguagePreference = storedPreference() ?? DEFAULT_LANGUAGE_PREFERENCE,
): Language {
  return languageForPreference(preference, browserLanguages())
}

function storedPreference(): LanguagePreference | null {
  try {
    const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return isLanguagePreference(value) ? value : null
  } catch {
    // Storage can be unavailable (private browsing): follow the browser.
    return null
  }
}

let currentLanguage: Language = resolveInitialLanguage()
let currentPreference: LanguagePreference = storedPreference() ?? DEFAULT_LANGUAGE_PREFERENCE

function applyDocumentLanguage(): void {
  if (typeof document !== 'undefined') document.documentElement.lang = currentLanguage
}

applyDocumentLanguage()

/** The language the UI is in now. */
export function getLanguage(): Language {
  return currentLanguage
}

/** What the user chose (`system` follows the browser). */
export function getLanguagePreference(): LanguagePreference {
  return currentPreference
}

/**
 * Applies a stored or chosen preference to the lookup and the document, and
 * mirrors it for the next launch's synchronous read. Does not reload: the
 * caller does that after a user choice, so every cached render updates.
 */
export function setLanguagePreference(preference: LanguagePreference): void {
  if (!isLanguagePreference(preference)) return
  currentPreference = preference
  currentLanguage = languageForPreference(preference, browserLanguages())
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, preference)
  } catch {
    // The preference is in the database; the mirror is an optimization.
  }
  applyDocumentLanguage()
}

/** The BCP 47 tag for `Intl` formatters: the UI language's usual formatting. */
export function locale(): string {
  return currentLanguage === 'zh-CN' ? 'zh-CN' : 'en-US'
}

/** The separator a name list uses: `a, b` / `a、b`. */
export function listSeparator(): string {
  return currentLanguage === 'zh-CN' ? '、' : ', '
}

/** Join names the locale's way: `a, b` / `a、b`. */
export function joinList(items: readonly string[]): string {
  return items.join(listSeparator())
}

/** `a or b` / `a、b或c` — a name list joined by "or". */
export function joinListOr(items: readonly string[]): string {
  if (items.length <= 1) return items.join('')
  const head = items.slice(0, -1).join(listSeparator())
  const last = items[items.length - 1] ?? ''
  return currentLanguage === 'zh-CN' ? `${head}或${last}` : `${head} or ${last}`
}

/** The localized name of a language, for a picker. */
export function languageName(language: Language): string {
  return language === 'zh-CN' ? '简体中文' : 'English'
}

function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = params[name]
    return value === undefined ? whole : String(value)
  })
}

/**
 * The copy for `key` in the current language, with `{name}` parameters
 * filled in. A key the current language lacks falls back to English.
 */
export function t(key: MessageKey, params?: MessageParams): string {
  const template = currentLanguage === 'zh-CN' ? (zhCN[key] ?? en[key]) : en[key]
  return interpolate(template, params)
}

/** The English copy of a message (tests and exports that must stay English). */
export function tEnglish(key: MessageKey): string {
  return en[key]
}

/**
 * Translates a message by its English text, for labels that are defined in
 * plain data (widget kinds, filter fields, settings sections) and rendered
 * elsewhere. The text must be one of the catalog's English values; anything
 * else (a user's own words, a list name) is returned unchanged.
 */
const englishToKey = new Map<string, MessageKey>()
for (const key of Object.keys(en) as MessageKey[]) {
  if (!englishToKey.has(en[key])) englishToKey.set(en[key], key)
}

export function translateText(english: string): string {
  if (currentLanguage !== 'zh-CN') return english
  const key = englishToKey.get(english)
  return key ? (zhCN[key] ?? english) : english
}

/** Whether the current language is English. */
export function isEnglish(): boolean {
  return currentLanguage === ENGLISH_LANGUAGE
}

/** What a language calls itself, without the current-language lookup. */
export { isLanguage }
