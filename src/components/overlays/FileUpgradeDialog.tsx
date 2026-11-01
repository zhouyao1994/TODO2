import type { FileUpgradeInfo } from '../../services/file-storage'
import { Dialog, DialogActions, DialogBody } from '../shared/Dialog'
import styles from './FileSyncDialogs.module.css'
import { t } from '../../i18n'

interface FileUpgradeDialogProps {
  info: FileUpgradeInfo
  onConfirm: () => void
  onCancel: () => void
}

/** One-time consent before an older sync file is loaded and rewritten. */
export function FileUpgradeDialog({ info, onConfirm, onCancel }: FileUpgradeDialogProps) {
  return (
    <Dialog open onClose={onCancel} blockBackdropClose size="md" title={t('ui.upgrade_sync_file')}>
      <DialogBody>
        {info.fileName} {t('ui.was_saved_by_an_older_version')}{info.fromVersion}{t('ui.to_keep_syncing_this_version_will')}{info.toVersion} {t('ui.format_older_todo2_builds_wont_be')}<div className={styles.note}>
          {t('ui.a_copy_of_the_file_as')}</div>
      </DialogBody>
      <DialogActions>
        <button className={styles.cancelButton} onClick={onCancel}>
          {t('ui.cancel_pause_sync')}</button>
        <button className={styles.primaryButton} onClick={onConfirm}>
          {t('ui.upgrade_file')}</button>
      </DialogActions>
    </Dialog>
  )
}
