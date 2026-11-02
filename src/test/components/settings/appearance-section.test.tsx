import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { AppearanceSection } from '../../../components/settings/sections/AppearanceSection'
import { useSettingsStore } from '../../../stores/settings-store'
import { db } from '../../../data/database'
import { DEFAULT_THEMED_COLORS } from '../../../models/theme-colors'
import { THEME_PALETTES, themePaletteSeeds } from '../../../models/ui-themes'

beforeEach(async () => {
  await db.delete()
  await db.open()
  useSettingsStore.setState({
    themeMode: 'dark',
    colors: { dark: { ...DEFAULT_THEMED_COLORS.dark }, light: { ...DEFAULT_THEMED_COLORS.light } },
  })
})

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-palette')
  // Clear inline overrides set by setColor side effects.
  const root = document.documentElement
  for (const v of [
    '--color-accent', '--color-app-bg', '--color-surface',
    '--color-border', '--color-header-bg',
    '--color-danger', '--color-warning', '--color-followup',
    '--color-deadline', '--color-accent-dim',
  ]) root.style.removeProperty(v)
})

describe('AppearanceSection color theme', () => {
  it('offers every palette as a radio, checked on the active one', () => {
    render(<AppearanceSection />)
    const group = screen.getByRole('radiogroup', { name: 'Color theme' })
    for (const palette of THEME_PALETTES) {
      const radio = screen.getByRole('radio', { name: palette.label })
      expect(radio.getAttribute('aria-checked')).toBe(String(useSettingsStore.getState().themePalette === palette.id))
    }
    expect(group).toBeTruthy()
  })

  it('clicking a palette switches it and seeds the non-customized colors', async () => {
    render(<AppearanceSection />)
    fireEvent.click(screen.getByRole('radio', { name: 'Everforest' }))
    await waitFor(() => {
      expect(useSettingsStore.getState().themePalette).toBe('everforest')
    })
    expect(useSettingsStore.getState().colors.dark.accent).toBe(themePaletteSeeds('everforest').dark.accent)
    expect(document.documentElement.getAttribute('data-palette')).toBe('everforest')
  })
})
