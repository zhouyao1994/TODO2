import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_LANGUAGE_PREFERENCE,
  isLanguage,
  isLanguagePreference,
  languageForPreference,
} from '../../models/language'
import { getLanguage, getLanguagePreference, locale, setLanguagePreference, t, translateText } from '../../i18n'
import { en } from '../../i18n/messages/en'
import { zhCN } from '../../i18n/messages/zh-CN'

afterEach(() => {
  // The module keeps the last language for the session: put it back on the browser's.
  setLanguagePreference(DEFAULT_LANGUAGE_PREFERENCE)
})

describe('language preference', () => {
  it('reads zh in any region as Simplified Chinese', () => {
    expect(languageForPreference('system', ['zh-CN'])).toBe('zh-CN')
    expect(languageForPreference('system', ['zh-TW'])).toBe('zh-CN')
    expect(languageForPreference('system', ['fr-FR', 'zh-Hans'])).toBe('zh-CN')
  })

  it('falls back to English when the browser speaks none of the supported languages', () => {
    expect(languageForPreference('system', ['fr-FR', 'de'])).toBe('en')
    expect(languageForPreference('system', [])).toBe('en')
  })

  it('a pinned language wins over the browser', () => {
    expect(languageForPreference('en', ['zh-CN'])).toBe('en')
    expect(languageForPreference('zh-CN', ['en-US'])).toBe('zh-CN')
  })

  it('recognizes only supported values', () => {
    expect(isLanguage('zh-CN')).toBe(true)
    expect(isLanguage('zh-TW')).toBe(false)
    expect(isLanguagePreference('system')).toBe(true)
    expect(isLanguagePreference('en')).toBe(true)
    expect(isLanguagePreference('fr')).toBe(false)
    expect(isLanguagePreference(undefined)).toBe(false)
  })
})

describe('message catalogs', () => {
  it('every key has a non-empty translation', () => {
    expect(Object.keys(zhCN).sort()).toEqual(Object.keys(en).sort())
    expect(Object.values(zhCN).every((text) => text.trim().length > 0)).toBe(true)
  })
})

describe('t', () => {
  it('returns the English copy by default', () => {
    setLanguagePreference('en')
    expect(getLanguage()).toBe('en')
    expect(t('ui.save')).toBe('Save')
    expect(t('ui.in_widgets', { n: 3 })).toBe('Shared · 3 widgets')
  })

  it('returns the translation, filling parameters', () => {
    setLanguagePreference('zh-CN')
    expect(getLanguagePreference()).toBe('zh-CN')
    expect(getLanguage()).toBe('zh-CN')
    expect(t('ui.save')).toBe('保存')
    expect(t('ui.in_widgets', { n: 3 })).toBe('共享 · 3 个组件')
    expect(t('ui.language_system')).toBe('跟随浏览器')
  })

  it('leaves an unknown parameter placeholder as it is', () => {
    setLanguagePreference('en')
    expect(t('ui.in_widgets', {})).toBe('Shared · {n} widgets')
  })

  it('formats dates for the chosen language', () => {
    setLanguagePreference('en')
    expect(locale()).toBe('en-US')
    setLanguagePreference('zh-CN')
    expect(locale()).toBe('zh-CN')
  })
})

describe('translateText', () => {
  it('translates catalog copy and leaves user text alone', () => {
    setLanguagePreference('zh-CN')
    expect(translateText('Priority')).toBe('优先级')
    expect(translateText('买牛奶')).toBe('买牛奶')
    expect(translateText('A list I named')).toBe('A list I named')
  })

  it('does nothing in English', () => {
    setLanguagePreference('en')
    expect(translateText('Priority')).toBe('Priority')
  })
})
