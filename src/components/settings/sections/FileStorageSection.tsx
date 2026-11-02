import { t, locale } from '../../../i18n'
import { useShallow } from 'zustand/react/shallow'
import { useFileStorageStore } from '../../../services/file-storage-store'
import { useIsMobile } from '../../../hooks/use-is-mobile'
import { FileSyncPausedControls } from '../../layout/FileSyncPausedControls'
import { SettingRow } from './SettingRow'
import styles from './sections.module.css'

/**
 * The sync file: attach / create one, or — once attached — its state
 * (syncing, permission needed, paused) and the ways forward.
 */
export function FileStorageSection() {
  // The fields shown, not the whole store (the launch question, a dismissed error).
  const fileStorage = useFileStorageStore(useShallow((s) => ({
    isSupported: s.isSupported,
    isConnected: s.isConnected,
    isLoading: s.isLoading,
    needsPermission: s.needsPermission,
    paused: s.paused,
    error: s.error,
    fileName: s.fileName,
    lastSavedAt: s.lastSavedAt,
    openFile: s.openFile,
    createFile: s.createFile,
    disconnect: s.disconnect,
    reconnect: s.reconnect,
  })))
  const isMobile = useIsMobile()
  const secondary = `${styles.button} ${styles.buttonSecondary}`
  const primary = `${styles.button} ${styles.buttonPrimary}`

  let body
  if (!fileStorage.isSupported) {
    body = (
      <SettingRow label={t('ui.sync_file')}>
        <span className={styles.muted}>
          {isMobile
            ? 'File sync is not supported on this browser. Use Import / Export instead.'
            : 'File sync requires Chrome or Edge (File System Access API). Use Import / Export to keep a backup.'}
        </span>
      </SettingRow>
    )
  } else if (fileStorage.needsPermission) {
    body = (
      <SettingRow
        label={t('ui.sync_file')}
        help={t('ui.permission_needed_to_sync_to_this')}
        column
      >
        <span className={styles.fileName}>{fileStorage.fileName}</span>
        <div className={styles.buttonRow}>
          <button type="button" className={primary} onClick={fileStorage.reconnect} disabled={fileStorage.isLoading}>
            {t('ui.grant_access_2')}</button>
          <button type="button" className={secondary} onClick={fileStorage.disconnect} disabled={fileStorage.isLoading}>
            {t('ui.disconnect')}</button>
        </div>
      </SettingRow>
    )
  } else if (fileStorage.paused) {
    body = (
      <SettingRow label={t('ui.sync_file')} help={fileStorage.paused.message} column>
        <span className={styles.fileName}>{fileStorage.fileName}</span>
        <div className={styles.buttonRow}>
          <FileSyncPausedControls buttonClassName={secondary} primaryButtonClassName={primary} />
          <button type="button" className={secondary} onClick={fileStorage.disconnect} disabled={fileStorage.isLoading}>
            {t('ui.disconnect')}</button>
        </div>
      </SettingRow>
    )
  } else if (fileStorage.isConnected) {
    body = (
      <SettingRow
        label={t('ui.sync_file')}
        help={fileStorage.lastSavedAt ? t('ui.last_saved_at', { time: fileStorage.lastSavedAt.toLocaleTimeString(locale()) }) : t('ui.autosave_note')}
        column
      >
        <span className={styles.fileName}>{fileStorage.fileName}</span>
        <button type="button" className={secondary} onClick={fileStorage.openFile} disabled={fileStorage.isLoading}>
          {t('ui.attach_to_different_file')}</button>
      </SettingRow>
    )
  } else {
    body = (
      <SettingRow
        label={t('ui.sync_file')}
        help={(
          <>
            {t('ui.your_tasks_live_in_this_browsers_2')}<br />
            {t('ui.an_existing_file_you_replace_is')}</>
        )}
      >
        <button type="button" className={primary} onClick={fileStorage.openFile} disabled={fileStorage.isLoading}>
          {t('ui.attach_to_file')}</button>
        <button type="button" className={secondary} onClick={fileStorage.createFile} disabled={fileStorage.isLoading}>
          {t('ui.create_new_file')}</button>
      </SettingRow>
    )
  }

  return (
    <div className={styles.section}>
      {body}
      {fileStorage.error && <div className={styles.errorMsg}>{fileStorage.error}</div>}
    </div>
  )
}
