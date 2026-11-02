import { useState } from 'react'
import { useSettingsStore, type ThemeMode } from '../../../stores/settings-store'
import { LANGUAGE_PREFERENCES, isLanguage, type LanguagePreference } from '../../../models/language'
import { languageName, t, type MessageKey } from '../../../i18n'
import { THEME_PALETTES, type ThemePaletteId } from '../../../models/ui-themes'
import { useIsMobile } from '../../../hooks/use-is-mobile'
import { ThemeColorsEditor } from '../ThemeColorsEditor'
import { NlpSyntaxModal } from '../NlpSyntaxModal'
import { SettingRow } from './SettingRow'
import { useStackedLayer } from './settings-layer'
import styles from './sections.module.css'

const THEME_OPTIONS: ReadonlyArray<{ mode: ThemeMode }> = [
  { mode: 'system' },
  { mode: 'light' },
  { mode: 'dark' },
]

/** Each palette's label message, by id. */
const PALETTE_LABEL_KEYS: Record<ThemePaletteId, MessageKey> = {
  default: 'ui.palette_default',
  nord: 'ui.palette_nord',
  solarized: 'ui.palette_solarized',
  'rose-pine': 'ui.palette_rose_pine',
  everforest: 'ui.palette_everforest',
}

/** Theme (the only place it is set), color theme, language, and theme colors. */
export function AppearanceSection() {
  const themeMode = useSettingsStore((s) => s.themeMode)
  const setThemeMode = useSettingsStore((s) => s.setThemeMode)
  const themePalette = useSettingsStore((s) => s.themePalette)
  const setThemePalette = useSettingsStore((s) => s.setThemePalette)
  const language = useSettingsStore((s) => s.language)
  const setLanguage = useSettingsStore((s) => s.setLanguage)
  const isMobile = useIsMobile()
  const [showThemeColors, setShowThemeColors] = useState(false)
  const [showNlpSyntax, setShowNlpSyntax] = useState(false)
  useStackedLayer(showThemeColors || showNlpSyntax)

  /** A language change reloads: every memoized row and module-level label reads the new catalog. */
  const chooseLanguage = (preference: LanguagePreference) => {
    if (preference === language) return
    void setLanguage(preference).then(() => window.location.reload())
  }

  return (
    <div className={styles.section}>
      <SettingRow label={t('ui.theme')} help={t('ui.system_follows_your_os_setting')}>
        <div className={styles.segmented} role="radiogroup" aria-label={t('ui.theme')}>
          {THEME_OPTIONS.map(({ mode }) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={themeMode === mode}
              className={`${styles.segment} ${themeMode === mode ? styles.segmentActive : ''}`}
              onClick={() => setThemeMode(mode)}
            >
              {t(mode === 'system' ? 'ui.theme_system' : mode === 'light' ? 'ui.theme_light' : 'ui.theme_dark')}
            </button>
          ))}
        </div>
      </SettingRow>
      <SettingRow label={t('ui.color_theme')} help={t('ui.color_theme_help')}>
        <div className={styles.paletteGroup} role="radiogroup" aria-label={t('ui.color_theme')}>
          {THEME_PALETTES.map((palette) => (
            <button
              key={palette.id}
              type="button"
              role="radio"
              aria-checked={themePalette === palette.id}
              className={`${styles.paletteOption} ${themePalette === palette.id ? styles.paletteOptionActive : ''}`}
              onClick={() => setThemePalette(palette.id)}
            >
              <span
                aria-hidden="true"
                className={styles.paletteSwatch}
                style={{ background: `linear-gradient(135deg, ${palette.colors.dark.accent} 50%, ${palette.colors.light.accent} 50%)` }}
              />
              {t(PALETTE_LABEL_KEYS[palette.id])}
            </button>
          ))}
        </div>
      </SettingRow>
      <SettingRow label={t('ui.language')} help={t('ui.language_help')}>
        <div className={styles.segmented} role="radiogroup" aria-label={t('ui.language')}>
          {LANGUAGE_PREFERENCES.map((preference) => (
            <button
              key={preference}
              type="button"
              role="radio"
              aria-checked={language === preference}
              className={`${styles.segment} ${language === preference ? styles.segmentActive : ''}`}
              onClick={() => chooseLanguage(preference)}
            >
              {isLanguage(preference) ? languageName(preference) : t('ui.language_system')}
            </button>
          ))}
        </div>
      </SettingRow>
      <SettingRow label={t('ui.theme_colors_2')} help={t('ui.override_accent_and_surface_colors_per')}>
        <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={() => setShowThemeColors(true)}>
          {t('ui.customize_colors')}</button>
      </SettingRow>
      {/* On desktop the syntax lives with the keyboard shortcuts. */}
      {isMobile && (
        <SettingRow label={t('ui.quick_add_syntax_2')} help={t('ui.people_tags_and_slash_commands_you')}>
          <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={() => setShowNlpSyntax(true)}>
            {t('ui.show_syntax')}</button>
        </SettingRow>
      )}

      {showThemeColors && <ThemeColorsEditor onClose={() => setShowThemeColors(false)} />}
      {showNlpSyntax && <NlpSyntaxModal onClose={() => setShowNlpSyntax(false)} />}
    </div>
  )
}
