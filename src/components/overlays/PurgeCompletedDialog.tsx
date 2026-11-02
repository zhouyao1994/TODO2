import { t as tr, t } from '../../i18n'
import { useState } from 'react'
import type { PersistedTodoItem } from '../../models'
import { useTodoStore } from '../../stores/todo-store'
import { useUndoStore } from '../../stores/undo-store'
import { noBackupNote } from '../../stores/safety-snapshot'
import { doneMessage, exportAndPurgeCompleted, keptMessage } from '../../services/purge-completed'
import { Dialog, DialogActions, DialogBody } from '../shared/Dialog'
import buttons from './FileSyncDialogs.module.css'
import styles from './TaskArchiveDialogs.module.css'
import { formatDateWith } from '../../utils/date'

interface PurgeCompletedDialogProps {
  /** The expired completed tasks, as currently in the store. */
  tasks: PersistedTodoItem[]
  retentionDays: number
  /** Tasks were deleted (with or without an archive). */
  onDone: () => void
  /** "Not now" / Escape — nothing deleted; asked again at a launch once the prompt interval has passed. */
  onDismiss: () => void
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function completedLabel(t: PersistedTodoItem): string {
  const when = t.completedAt ?? t.modifiedAt
  const d = new Date(when)
  return Number.isNaN(d.getTime()) ? 'Completed' : `Completed ${formatDateWith(d, { year: 'numeric', month: 'numeric', day: 'numeric' })}`
}

/**
 * Launch prompt for the completed-task retention setting — completed tasks
 * past retention are never deleted silently. Nothing is deleted until the user picks
 * **Export & delete** (archive file first; cancelling the file picker
 * deletes nothing) or **Delete**; **Not now** deletes nothing (asked again once the prompt interval has passed).
 */
export function PurgeCompletedDialog({ tasks, retentionDays, onDone, onDismiss }: PurgeCompletedDialogProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ids = tasks.map((t) => t.id)

  const handleExportAndDelete = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await exportAndPurgeCompleted(ids)
      if (result.status === 'cancelled') return
      if (result.status === 'error') {
        setError(result.message)
        return
      }
      if (result.status === 'kept') {
        setError(keptMessage(result))
        return
      }
      if (result.noBackup) {
        useUndoStore.getState().notify(`${doneMessage(result)} ${noBackupNote()}`)
      }
      onDone()
    } catch (err) {
      setError(`Nothing was deleted — ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    setBusy(true)
    setError(null)
    try {
      const outcome = await useTodoStore.getState().purgeCompleted(ids)
      if (outcome.status === 'cancelled') {
        setError(t('ui.nothing_deleted'))
        return
      }
      if (outcome.noBackup) {
        useUndoStore.getState().notify(`Deleted ${plural(outcome.deleted, 'completed task')}. ${noBackupNote()}`)
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      onClose={() => { if (!busy) onDismiss() }}
      blockBackdropClose
      size="md"
      title={`Delete ${plural(tasks.length, 'old completed task')}?`}
    >
      <DialogBody>
        {tr('ui.these_tasks_were_completed_more_than')}{' '}{plural(retentionDays, 'day')} {tr('ui.ago_settings_tasks_completed_tasks')}<ul className={styles.list} data-testid="purge-task-list">
          {tasks.map((t) => (
            <li key={t.id} className={styles.row}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle} title={t.title}>{t.title}</span>
                <span className={styles.rowMeta}>{completedLabel(t)}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className={styles.note}>
          <strong>{tr('ui.export_delete')}</strong> {tr('ui.saves_them_to_a_file_first')}</div>
        {error && <div className={styles.error} role="alert">{error}</div>}
      </DialogBody>
      <DialogActions>
        <button className={buttons.cancelButton} onClick={onDismiss} disabled={busy}>
          {tr('ui.not_now')}</button>
        <button className={buttons.dangerButton} onClick={handleDelete} disabled={busy}>
          {tr('ui.delete')}</button>
        <button className={buttons.primaryButton} onClick={handleExportAndDelete} disabled={busy}>
          {tr('ui.export_delete')}</button>
      </DialogActions>
    </Dialog>
  )
}
