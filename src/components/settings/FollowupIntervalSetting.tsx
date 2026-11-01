import { useState } from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import {
  describeFollowupInterval,
  formatFollowupInterval,
  parseFollowupInterval,
} from '../../utils/followup'
import { SettingRow } from './sections/SettingRow'
import styles from './sections/sections.module.css'
import { t } from '../../i18n'

/**
 * Settings → Task defaults: "Set a next follow-up automatically" and the
 * follow-up interval (`1m`, `2w`, `10d`, `1y`). While the switch is on, new
 * tasks and "Mark followed up" set the next follow-up to today + the
 * interval; off, new tasks get none and Mark followed up clears it. The
 * interval commits on Enter / blur; invalid text reverts.
 */
export function FollowupIntervalSetting() {
  const autoFollowup = useSettingsStore((s) => s.autoFollowup)
  const setAutoFollowup = useSettingsStore((s) => s.setAutoFollowup)
  const interval = useSettingsStore((s) => s.followupDefaultInterval)
  const setInterval = useSettingsStore((s) => s.setFollowupDefaultInterval)
  const stored = formatFollowupInterval(interval)
  const [draft, setDraft] = useState(stored)
  const [syncedFrom, setSyncedFrom] = useState(stored)
  if (stored !== syncedFrom) {
    setSyncedFrom(stored)
    setDraft(stored)
  }

  const parsed = parseFollowupInterval(draft)

  const commit = () => {
    if (!parsed) {
      setDraft(stored)
      return
    }
    const canonical = formatFollowupInterval(parsed)
    setDraft(canonical)
    if (canonical !== stored) void setInterval(parsed)
  }

  return (
    <>
      <SettingRow
        label={t('ui.set_a_next_follow_up_automatically')}
        help={t('ui.new_tasks_and_mark_followed_up')}
      >
        <button
          type="button"
          role="switch"
          aria-checked={autoFollowup}
          aria-label={t('ui.set_a_next_follow_up_automatically')}
          className={`${styles.switch} ${autoFollowup ? styles.switchOn : ''}`}
          onClick={() => void setAutoFollowup(!autoFollowup)}
        />
      </SettingRow>
      <SettingRow
        label={t('ui.follow_up_interval')}
        help={autoFollowup ? t('ui.followup_interval_help_on') : t('ui.followup_interval_help_off')}
      >
        <input
          type="text"
          className={styles.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            // Esc reverts a changed draft and stays in Settings; with nothing
            // to revert it reaches the modal, which closes.
            if (e.key === 'Escape' && draft !== stored) {
              e.preventDefault()
              e.stopPropagation()
              setDraft(stored)
            }
          }}
          aria-label={t('ui.follow_up_interval')}
          aria-invalid={!parsed}
          placeholder={t('ui.1m')}
          style={{ width: 64, textAlign: 'right' }}
          spellCheck={false}
          autoComplete="off"
        />
        {parsed && (
          <span className={styles.muted} aria-live="polite">{describeFollowupInterval(parsed)}</span>
        )}
      </SettingRow>
    </>
  )
}
