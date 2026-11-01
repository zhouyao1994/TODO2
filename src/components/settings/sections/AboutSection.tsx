import { useFileStorageStore } from '../../../services/file-storage-store'
import styles from './sections.module.css'
import { t } from '../../../i18n'

/** What the app is and where the data lives. */
export function AboutSection() {
  const isConnected = useFileStorageStore((s) => s.isConnected)
  const fileName = useFileStorageStore((s) => s.fileName)
  return (
    <div className={styles.section}>
      <div className={styles.about}>
        {t('ui.todo2_a_local_first_todo_app')}<br />
        {t('ui.data_stored')}{' '}{isConnected ? t('ui.in_file_named', { file: fileName ?? '' }) : t('ui.locally_in_browser')}<br />
        {t('ui.no_account_no_server_fully_offline')}</div>
    </div>
  )
}
