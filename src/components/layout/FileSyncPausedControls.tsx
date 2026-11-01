import { useState } from 'react'
import { useFileStorageStore } from '../../services/file-storage-store'
import { Dialog, DialogActions, DialogBody } from '../shared/Dialog'
import dialogStyles from '../overlays/FileSyncDialogs.module.css'
import { t } from '../../i18n'

interface FileSyncPausedControlsProps {
  buttonClassName?: string
  primaryButtonClassName?: string
  /** Called when Retry or Overwrite file is pressed (the storage pill closes its popover, the phone its sheet). */
  onDone?: () => void
}

/**
 * The ways forward from a paused sync: Retry (re-run the load decision —
 * re-shows the conflict / upgrade prompt, or re-reads a fixed file) and
 * "Keep browser data…" (confirm, back the file up, overwrite it). Leaving it
 * alone keeps sync paused with both sides untouched. Shared by the storage
 * pill's popover, the phone's status sheet and Settings → File storage.
 */
export function FileSyncPausedControls({ buttonClassName, primaryButtonClassName, onDone }: FileSyncPausedControlsProps) {
  const paused = useFileStorageStore((s) => s.paused)
  const fileName = useFileStorageStore((s) => s.fileName)
  const isLoading = useFileStorageStore((s) => s.isLoading)
  const retry = useFileStorageStore((s) => s.retry)
  const overwrite = useFileStorageStore((s) => s.overwriteFileWithBrowser)
  const [confirming, setConfirming] = useState(false)

  if (!paused) return null

  return (
    <>
      <button className={buttonClassName} onClick={() => { void retry(); onDone?.() }} disabled={isLoading}>
        {t('ui.retry')}</button>
      <button
        className={primaryButtonClassName ?? buttonClassName}
        onClick={() => setConfirming(true)}
        disabled={isLoading}
      >
        {t('ui.keep_browser_data')}</button>
      {confirming && (
        // In place: opened from the storage pill's popover, a dialog portaled out of
        // it would count as an outside click and close the popover.
        <Dialog open inline onClose={() => setConfirming(false)} size="md" title={t('ui.overwrite_the_sync_file')}>
          <DialogBody>
            {t('ui.replace_the_contents_of')}{' '}<strong>{fileName}</strong> {t('ui.with_this_browsers_data_the_files')}{paused.reason === 'too-new' && (
              <div className={dialogStyles.note}>
                {t('ui.the_file_was_written_by_a')}</div>
            )}
            {paused.reason === 'too-old' && (
              <div className={dialogStyles.note}>
                {t('ui.the_file_was_written_by_an')}</div>
            )}
          </DialogBody>
          <DialogActions>
            <button className={dialogStyles.cancelButton} onClick={() => setConfirming(false)}>
              {t('ui.cancel')}</button>
            <button
              className={dialogStyles.dangerButton}
              onClick={() => { setConfirming(false); void overwrite(); onDone?.() }}
            >
              {t('ui.overwrite_file')}</button>
          </DialogActions>
        </Dialog>
      )}
    </>
  )
}
