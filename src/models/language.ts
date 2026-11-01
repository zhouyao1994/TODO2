/**
 * The languages the app speaks, and the stored preference between them.
 *
 * `system` (the default) follows the browser on launch; the others pin one
 * language. Only the UI is translated — task text, notes, people and tags
 * stay exactly as the user wrote them.
 */

/** The languages a message catalog exists for. */
export const LANGUAGES = ['en', 'zh-CN'] as const

export type Language = (typeof LANGUAGES)[number]

/** What the settings table stores: `system` = follow the browser. */
export const LANGUAGE_PREFERENCES = ['system', ...LANGUAGES] as const

export type LanguagePreference = (typeof LANGUAGE_PREFERENCES)[number]

export const DEFAULT_LANGUAGE_PREFERENCE: LanguagePreference = 'system'

export const ENGLISH_LANGUAGE: Language = 'en'

export function isLanguage(v: unknown): v is Language {
  return typeof v === 'string' && (LANGUAGES as readonly string[]).includes(v)
}

export function isLanguagePreference(v: unknown): v is LanguagePreference {
  return typeof v === 'string' && (LANGUAGE_PREFERENCES as readonly string[]).includes(v)
}

/**
 * The language to show: the pinned one, or — for `system` — the first
 * supported language the browser asks for (`zh` in any region reads as
 * Simplified Chinese), English when it asks for none of them.
 */
export function languageForPreference(
  preference: LanguagePreference,
  browserLanguages: readonly string[] = [],
): Language {
  if (preference !== 'system') return preference
  for (const tag of browserLanguages) {
    const base = tag.toLowerCase()
    if (base === 'zh' || base.startsWith('zh-') || base === 'zh-cn' || base === 'zh-sg') return 'zh-CN'
  }
  return ENGLISH_LANGUAGE
}
