import { t as tr, t } from '../../../i18n'
import { useCallback, useMemo, useState } from 'react'
import { useFlashMessage } from '../../../hooks/use-flash-message'
import { useSettingsStore } from '../../../stores/settings-store'
import { useTodoStore } from '../../../stores/todo-store'
import { doneMessage, exportAndPurgeCompleted, keptMessage } from '../../../services/purge-completed'
import { noBackupNote } from '../../../stores/safety-snapshot'
import {
  PURGE_PROMPT_INTERVAL_MAX_DAYS,
  isExpiredCompleted,
  isPurgePromptIntervalDays,
  nextPurgePromptDay,
  retentionCutoff,
  selectExpiredCompleted,
} from '../../../utils/completed-at'
import { formatDateShort } from '../../../utils/date'
import { DialogFrame } from '../../shared/Dialog'
import { SettingRow } from './SettingRow'
import { useStackedLayer } from './settings-layer'
import { plural } from './plural'
import styles from './sections.module.css'

const RETENTION_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'Keep forever' },
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
]

const CLEANUP_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 0, label: 'All completed' },
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
]

/**
 * The retention setting (completed tasks past it are offered for deletion at
 * launch, never purged silently) and the manual "Delete completed tasks"
 * popup with Export & delete.
 */
export function CompletedTasksSection() {
  const completedRetentionDays = useSettingsStore((s) => s.completedRetentionDays)
  const setCompletedRetentionDays = useSettingsStore((s) => s.setCompletedRetentionDays)
  const todos = useTodoStore((s) => s.todos)
  const purgeCompleted = useTodoStore((s) => s.purgeCompleted)
  const [showCleanup, setShowCleanup] = useState(false)
  const [cleanupDays, setCleanupDays] = useState(30)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, flash] = useFlashMessage('')
  useStackedLayer(showCleanup)

  const retentionStats = useMemo(() => {
    if (completedRetentionDays == null) return null
    const now = new Date()
    const cutoff = retentionCutoff(completedRetentionDays, now)
    const weekFromNow = new Date(now)
    weekFromNow.setDate(weekFromNow.getDate() + 7)
    const expiringCutoff = retentionCutoff(completedRetentionDays, weekFromNow)
    const completed = todos.filter((t) => t.isCompleted)
    const expired = completed.filter((t) => isExpiredCompleted(t, cutoff)).length
    const expiringThisWeek = completed.filter(
      (t) => !isExpiredCompleted(t, cutoff) && isExpiredCompleted(t, expiringCutoff),
    ).length
    return { expired, expiringThisWeek, total: completed.length }
  }, [todos, completedRetentionDays])

  const purgePromptLastAt = useSettingsStore((s) => s.purgePromptLastAt)
  const purgePromptIntervalDays = useSettingsStore((s) => s.purgePromptIntervalDays)
  const nextAsk = nextPurgePromptDay(purgePromptLastAt, purgePromptIntervalDays)

  const completedCount = useMemo(() => todos.filter((t) => t.isCompleted).length, [todos])
  const matches = useMemo(() => selectExpiredCompleted(todos, cleanupDays), [todos, cleanupDays])
  const matchCount = matches.length

  const closeCleanup = useCallback(() => {
    setShowCleanup(false)
    setCleanupDays(30)
    setConfirming(false)
    setError(null)
  }, [])

  const showMessage = (msg: string) => flash(msg, 5000)

  const handleDelete = async () => {
    if (matchCount === 0) return
    if (!confirming) {
      setConfirming(true)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const outcome = await purgeCompleted(matches.map((t) => t.id))
      if (outcome.status === 'cancelled') {
        setError(t('ui.nothing_deleted'))
        return
      }
      closeCleanup()
      showMessage(`Deleted ${plural(outcome.deleted, 'completed task')}.${outcome.noBackup ? ` ${noBackupNote()}` : ''}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  /** "Export & delete": archive file first, then delete. */
  const handleExportDelete = async () => {
    if (matchCount === 0) return
    setBusy(true)
    setError(null)
    try {
      const result = await exportAndPurgeCompleted(matches.map((t) => t.id))
      if (result.status === 'cancelled') return
      if (result.status === 'error') {
        setError(result.message)
        return
      }
      if (result.status === 'kept') {
        setError(keptMessage(result))
        return
      }
      closeCleanup()
      showMessage(`${doneMessage(result)}${result.noBackup ? ` ${noBackupNote()}` : ''}`)
    } catch (err) {
      setError(`Nothing was deleted — ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.section}>
      <SettingRow
        label={tr('ui.offer_to_delete_after')}
        help={tr('ui.completed_tasks_older_than_this_are')}
        column
      >
        <select
          className={styles.select}
          aria-label={tr('ui.offer_to_delete_completed_tasks_after')}
          value={completedRetentionDays ?? ''}
          onChange={(e) => setCompletedRetentionDays(e.target.value ? Number(e.target.value) : null)}
        >
          {RETENTION_OPTIONS.map(({ value }) => (
            <option key={value} value={value}>{value === '' ? tr('ui.keep_forever') : tr('ui.days_count_many', { n: Number(value) })}</option>
          ))}
        </select>
        {retentionStats && (
          <>
            {retentionStats.expired > 0 && (
              <span className={styles.warningText}>
                {plural(retentionStats.expired, 'completed task')} {tr('ui.past_retention')}{nextAsk
                  ? `you'll be asked at a launch from ${formatDateShort(nextAsk)}`
                  : 'you\'ll be asked on next launch'})
              </span>
            )}
            {retentionStats.expiringThisWeek > 0 && (
              <span className={styles.muted}>{retentionStats.expiringThisWeek} {tr('ui.more_will_expire_in_the_next')}</span>
            )}
            {retentionStats.expired === 0 && retentionStats.expiringThisWeek === 0 && (
              <span className={styles.muted}>{plural(retentionStats.total, 'completed task')}{tr('ui.none_expiring_soon')}</span>
            )}
          </>
        )}
      </SettingRow>
      {completedRetentionDays != null && <PurgePromptIntervalSetting />}
      <SettingRow label={tr('ui.delete_completed_tasks')} help={tr('ui.a_backup_is_taken_first_export')} column>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonDanger}`}
          disabled={completedCount === 0}
          onClick={() => setShowCleanup(true)}
        >
          {tr('ui.delete_completed_tasks_2')}</button>
        {message && <span className={styles.successMsg}>{message}</span>}
      </SettingRow>

      {showCleanup && (
        // The shared frame (Esc, backdrop press, focus in / trap / back);
        // nothing closes it while a delete runs.
        <DialogFrame
          onClose={() => { if (!busy) closeCleanup() }}
          className={styles.cleanupPopup}
          aria-label={tr('ui.delete_completed_tasks')}
        >
            <div className={styles.cleanupTitle}>{tr('ui.delete_completed_tasks')}</div>
            <div className={styles.cleanupRow}>
              <span className={styles.label}>{tr('ui.older_than')}</span>
              <select
                className={styles.select}
                aria-label={tr('ui.older_than')}
                value={cleanupDays}
                onChange={(e) => { setCleanupDays(Number(e.target.value)); setConfirming(false) }}
              >
                {CLEANUP_OPTIONS.map(({ value }) => (
                  <option key={value} value={value}>{value === 0 ? tr('ui.all_completed') : tr('ui.days_count_many', { n: value })}</option>
                ))}
              </select>
            </div>
            <div className={styles.cleanupCount}>
              {matchCount > 0
                ? `${plural(matchCount, 'task')} will be deleted. A backup will be created. Export & delete also saves them to a file you can add back with "Import tasks (append)…".`
                : t('ui.no_matching_tasks')}
            </div>
            {error && <div className={styles.errorMsg} role="alert">{error}</div>}
            <div className={styles.buttonRow}>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonPrimary}`}
                disabled={matchCount === 0 || busy}
                onClick={handleExportDelete}
              >
                {`Export & delete ${plural(matchCount, 'task')}`}
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonDanger}`}
                disabled={matchCount === 0 || busy}
                onClick={handleDelete}
              >
                {confirming
                  ? `Confirm — permanently delete ${plural(matchCount, 'task')}`
                  : `Delete ${plural(matchCount, 'task')}`}
              </button>
              <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={closeCleanup} disabled={busy}>
                {tr('ui.cancel')}</button>
            </div>
        </DialogFrame>
      )}
    </div>
  )
}

/**
 * How often the launch prompt may ask about old completed tasks: at most
 * once every N days (1–365), counted from the day it last showed, whatever
 * the answer. A whole number, committed on Enter / blur; anything else
 * reverts. Each change is one undo step.
 */
function PurgePromptIntervalSetting() {
  const days = useSettingsStore((s) => s.purgePromptIntervalDays)
  const setDays = useSettingsStore((s) => s.setPurgePromptIntervalDays)
  const stored = String(days)
  const [draft, setDraft] = useState(stored)
  const [syncedFrom, setSyncedFrom] = useState(stored)
  if (stored !== syncedFrom) {
    setSyncedFrom(stored)
    setDraft(stored)
  }
  const parsed = /^\d+$/.test(draft.trim()) ? Number(draft.trim()) : Number.NaN
  const valid = isPurgePromptIntervalDays(parsed)

  const commit = () => {
    if (!valid) {
      setDraft(stored)
      return
    }
    setDraft(String(parsed))
    if (parsed !== days) void setDays(parsed)
  }

  return (
    <SettingRow
      label={tr('ui.ask_at_most_every')}
      help={tr('ui.days_between_two_of_those_launch')}
    >
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={PURGE_PROMPT_INTERVAL_MAX_DAYS}
        step={1}
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
        aria-label={tr('ui.ask_at_most_every_days')}
        aria-invalid={!valid}
        style={{ width: 64, textAlign: 'right' }}
        autoComplete="off"
      />
      <span className={styles.muted}>{parsed === 1 ? 'day' : 'days'}</span>
    </SettingRow>
  )
}
