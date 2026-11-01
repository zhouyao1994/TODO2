import { useState } from 'react'
import { NlpSyntaxModal } from '../NlpSyntaxModal'
import { ShortcutEditor } from '../ShortcutEditor'
import { ConfirmDialog } from '../../shared/Dialog'
import { useSettingsStore } from '../../../stores/settings-store'
import { SettingRow } from './SettingRow'
import { useStackedLayer } from './settings-layer'
import styles from './sections.module.css'
import { t } from '../../../i18n'

/** Every keyboard shortcut, editable (`?` still lists them in a modal), plus the quick-add syntax. */
export function ShortcutsSection() {
  const [showNlpSyntax, setShowNlpSyntax] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const anyChanged = useSettingsStore((s) => Object.keys(s.shortcutOverrides).length > 0)
  const resetAll = useSettingsStore((s) => s.resetAllShortcuts)
  useStackedLayer(showNlpSyntax || confirmReset)

  return (
    <div className={styles.section}>
      <SettingRow label={t('ui.quick_add_syntax_2')} help={t('ui.people_tags_and_slash_commands_you')}>
        <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={() => setShowNlpSyntax(true)}>
          {t('ui.show_syntax')}</button>
      </SettingRow>
      <SettingRow
        label={t('ui.shortcut_keys')}
        help={t('ui.change_a_shortcuts_keys_press_a')}
      >
        <button
          type="button"
          className={`${styles.button} ${styles.buttonSecondary}`}
          disabled={!anyChanged}
          onClick={() => setConfirmReset(true)}
        >
          {t('ui.reset_all')}</button>
      </SettingRow>
      <div className={styles.shortcuts}>
        <ShortcutEditor />
      </div>
      {showNlpSyntax && <NlpSyntaxModal onClose={() => setShowNlpSyntax(false)} />}
      <ConfirmDialog
        open={confirmReset}
        title={t('ui.reset_all_shortcuts')}
        message={t('ui.reset_all_shortcuts_help')}
        confirmLabel={t('ui.reset_all_2')}
        onConfirm={() => {
          setConfirmReset(false)
          void resetAll()
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  )
}
