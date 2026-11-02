import { useState } from 'react'
import { useSettingsStore, type ThemeColors, type ThemeName } from '../../stores/settings-store'
import { useResolvedTheme } from '../../hooks/use-resolved-theme'
import { ColorInput } from '../shared/ColorInput'
import styles from './EntityEditor.module.css'
import settingsStyles from './modal-chrome.module.css'
import { EditorModal } from './EditorModal'
import editorStyles from './ThemeColorsEditor.module.css'
import { t } from '../../i18n'

const colorLabels: Record<keyof ThemeColors, 'ui.color_accent' | 'ui.color_app_bg' | 'ui.color_surface' | 'ui.color_border' | 'ui.color_header' | 'ui.color_danger' | 'ui.color_warning' | 'ui.color_star' | 'ui.due_date'> = {
  accent: 'ui.color_accent',
  appBg: 'ui.color_app_bg',
  surface: 'ui.color_surface',
  border: 'ui.color_border',
  header: 'ui.color_header',
  danger: 'ui.color_danger',
  warning: 'ui.color_warning',
  star: 'ui.color_star',
  deadline: 'ui.due_date',
}

const themeLabel: Record<ThemeName, 'ui.theme_dark' | 'ui.theme_light'> = { dark: 'ui.theme_dark', light: 'ui.theme_light' }

interface ThemeColorsEditorProps {
  onClose: () => void
}

export function ThemeColorsEditor({ onClose }: ThemeColorsEditorProps) {
  const colors = useSettingsStore((s) => s.colors)
  const { setColor, resetColors } = useSettingsStore.getState()
  // Editor binds to the resolved theme on mount; the Light/Dark toggle below
  // only switches which `colors[theme]` bag the inputs read/write — it does
  // not change the user's theme (Settings → Appearance).
  const resolvedTheme = useResolvedTheme()
  const [workingTheme, setWorkingTheme] = useState<ThemeName>(resolvedTheme)
  const workingColors = colors[workingTheme]

  return (
    <EditorModal title={<>{t('ui.theme_colors')}{' '}{t(themeLabel[workingTheme])}</>} onClose={onClose}>
      <div className={editorStyles.themeToggle} role="tablist" aria-label={t('ui.working_theme')}>
        {(['dark', 'light'] as const).map((theme) => (
          <button
            key={theme}
            type="button"
            role="tab"
            aria-selected={workingTheme === theme}
            className={`${editorStyles.themeToggleBtn} ${workingTheme === theme ? editorStyles.themeToggleBtnActive : ''}`}
            onClick={() => setWorkingTheme(theme)}
          >
            {t(themeLabel[theme])}
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {(Object.keys(colorLabels) as Array<keyof ThemeColors>).map((key) => (
          <div key={key} className={settingsStyles.colorRow}>
            <span className={settingsStyles.colorLabel}>{t(colorLabels[key])}</span>
            <ColorInput value={workingColors[key]} onChange={(color) => setColor(workingTheme, key, color)} />
          </div>
        ))}
      </div>

      <div className={settingsStyles.buttonRow}>
        <button className={`${settingsStyles.button} ${settingsStyles.buttonSecondary}`} onClick={() => resetColors(workingTheme)}>
          {t('ui.reset')} {t(themeLabel[workingTheme])} {t('ui.to_defaults')}</button>
      </div>
    </EditorModal>
  )
}
