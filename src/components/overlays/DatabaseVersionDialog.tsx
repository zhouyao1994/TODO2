import type { TooNewDBInfo } from '../../services/migration-check'
import { tooNewDatabaseMessage, tooOldDatabaseMessage } from '../../data/database'
import { Dialog, DialogActions, DialogBody } from '../shared/Dialog'
import styles from './DatabaseVersionDialog.module.css'
import { t } from '../../i18n'

/**
 * The browser's database was saved by a newer version of TODO2: this one
 * reads and writes none of it — the only way on is the newer version
 * (Reload). Nothing to close.
 */
export function DatabaseTooNewDialog({ info }: { info: TooNewDBInfo }) {
  return (
    <Dialog open onClose={() => {}} blockBackdropClose size="md" title={t('ui.data_from_a_newer_version_of')}>
      <DialogBody>
        {tooNewDatabaseMessage(info.storedVersion, info.buildVersion)} {t('ui.if_the_newer_version_is_open')}</DialogBody>
      <DialogActions>
        <button className={styles.primaryButton} onClick={() => window.location.reload()}>
          {t('ui.reload')}</button>
      </DialogActions>
    </Dialog>
  )
}

/**
 * The browser's database is below the floor (`storedVersion` `null` when
 * only its open told): this version reads and writes none of it, and there
 * is no going on anyway — the message names the build that still upgrades
 * it. Reload only, nothing to close.
 */
export function DatabaseTooOldDialog({ info }: { info: { storedVersion: number | null; floorVersion?: number } }) {
  return (
    <Dialog open onClose={() => {}} blockBackdropClose size="md" title={t('ui.data_from_an_older_version_of')}>
      <DialogBody>{tooOldDatabaseMessage(info.storedVersion, info.floorVersion)}</DialogBody>
      <DialogActions>
        <button className={styles.primaryButton} onClick={() => window.location.reload()}>
          {t('ui.reload')}</button>
      </DialogActions>
    </Dialog>
  )
}
