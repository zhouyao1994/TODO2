import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../data/database'
import { useSettingsStore } from '../../stores/settings-store'
import { getLanguage, getLanguagePreference } from '../../i18n'

beforeEach(async () => {
  await db.delete()
  await db.open()
  useSettingsStore.setState({ language: 'system' })
})

afterEach(async () => {
  // The i18n module outlives a test: put the preference back where it started.
  useSettingsStore.setState({ language: 'system' })
  const { setLanguagePreference } = await import('../../i18n')
  setLanguagePreference('system')
  await db.delete()
})

describe('the language setting', () => {
  it('load applies the stored language to the UI', async () => {
    await db.settings.put({ key: 'language', value: 'zh-CN' })
    await useSettingsStore.getState().load()
    expect(useSettingsStore.getState().language).toBe('zh-CN')
    expect(getLanguage()).toBe('zh-CN')
  })

  it('an unknown stored value reads as the default (follow the browser)', async () => {
    await db.settings.put({ key: 'language', value: 'klingon' })
    await useSettingsStore.getState().load()
    expect(useSettingsStore.getState().language).toBe('system')
  })

  it('setLanguage stores a pinned language and applies it at once', async () => {
    await useSettingsStore.getState().setLanguage('zh-CN')
    expect((await db.settings.get('language'))?.value).toBe('zh-CN')
    expect(getLanguage()).toBe('zh-CN')
  })

  it('setLanguage(system) removes the row and follows the browser again', async () => {
    await useSettingsStore.getState().setLanguage('zh-CN')
    await useSettingsStore.getState().setLanguage('system')
    expect(await db.settings.get('language')).toBeUndefined()
    expect(getLanguagePreference()).toBe('system')
    expect(getLanguage()).toBe('en')
  })
})
