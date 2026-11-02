import { useEffect, useId, useRef } from 'react'
import { useFileStorageStore, type LaunchPermissionPrompt } from '../../services/file-storage-store'
import { useIsMobile } from '../../hooks/use-is-mobile'
import { DialogFrame } from '../shared/Dialog'
import { AlertCircleIcon, FileIcon, InfoIcon, LayoutIcon, LockIcon, PauseIcon } from '../shared/icons'
import styles from './LaunchPermissionDialog.module.css'
import { t } from '../../i18n'

/**
 * The launch question, over the start screen, when the attached sync file
 * needs the browser's permission again (after a browser restart): **Grant
 * access…** (the browser's own prompt, then the file loads as usual) or
 * **Continue without the file** (this browser's data, sync paused, nothing
 * written to the file). Launch waits for the answer. No ×, no backdrop
 * close; Esc = Continue (the answer that changes nothing). Asked at every
 * launch while the file is attached and needs permission.
 */
export function LaunchPermissionDialog({ prompt }: { prompt: LaunchPermissionPrompt }) {
  const grant = useFileStorageStore((s) => s.grantLaunchPermission)
  const continueWithout = useFileStorageStore((s) => s.continueWithoutFile)
  const isMobile = useIsMobile()
  const titleId = useId()
  const bodyId = useId()
  const grantRef = useRef<HTMLButtonElement>(null)
  const { fileName, phase } = prompt
  const waiting = phase === 'waiting'
  const file = <strong className={styles.fileName}>{fileName}</strong>
  // Refused: focus back on the primary, now Try again (it was disabled while waiting).
  useEffect(() => {
    if (phase === 'refused') grantRef.current?.focus()
  }, [phase])

  let middle
  if (waiting) {
    middle = (
      <div className={styles.status} role="status">
        <InfoIcon size={14} />
        <span>{t('ui.answer_the_prompt_your_browser_shows')}</span>
      </div>
    )
  } else if (phase === 'refused') {
    middle = (
      <div className={styles.refused} role="alert">
        <span className={styles.refusedIcon}><AlertCircleIcon size={14} /></span>
        <span>
          <span className={styles.refusedTitle}>{t('ui.your_browser_didnt_allow_access')}</span>
          <span className={styles.refusedLine}>
            {t('ui.try_again_or_continue_without_the')}</span>
        </span>
      </div>
    )
  } else if (isMobile) {
    middle = (
      <div className={styles.optionLines}>
        <p><strong>{t('ui.grant_access_menu')}</strong> {t('ui.your_browser_asks_you_to_allow')}</p>
        <p><strong>{t('ui.continue_without_the_file')}</strong> {t('ui.open_this_browsers_data_sync_stays')}</p>
      </div>
    )
  } else {
    middle = (
      <div className={styles.options}>
        <div className={styles.option}>
          <span className={`${styles.optionIcon} ${styles.optionIconGrant}`}><LockIcon size={13} /></span>
          <span>
            <span className={styles.optionTitle}>{t('ui.grant_access_menu')}</span>
            <span className={styles.optionLine}>{t('ui.your_browser_asks_you_to_allow_2')}</span>
          </span>
        </div>
        <div className={styles.option}>
          <span className={`${styles.optionIcon} ${styles.optionIconContinue}`}><PauseIcon size={13} /></span>
          <span>
            <span className={styles.optionTitle}>{t('ui.continue_without_the_file')}</span>
            <span className={styles.optionLine}>
              {t('ui.opens_the_copy_of_your_data')}{' '}{fileName}{t('ui.you_can_grant_access_later_from')}</span>
          </span>
        </div>
      </div>
    )
  }

  const grantButton = (
    <button
      ref={grantRef}
      type="button"
      className={styles.primary}
      onClick={grant}
      disabled={waiting}
    >
      {waiting && <span className={styles.spinner} aria-hidden="true" />}
      {waiting ? t('ui.waiting_browser') : phase === 'refused' ? t('ui.try_again') : t('ui.grant_access_menu')}
    </button>
  )
  const continueButton = (
    <button type="button" className={styles.secondary} onClick={continueWithout}>
      {t('ui.continue_without_the_file')}{!isMobile && <kbd className={styles.kbd}>Esc</kbd>}
    </button>
  )

  return (
    <DialogFrame
      onClose={continueWithout}
      blockBackdropClose
      initialFocus={grantRef}
      className={styles.frame}
      backdropClassName={styles.backdrop}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      data={{ 'launch-permission': phase }}
    >
      <div className={styles.mark} aria-hidden="true"><LayoutIcon size={16} />{t('ui.todo2')}</div>
      <div className={styles.card} aria-busy={waiting ? 'true' : undefined}>
        <span className={styles.icon}><FileIcon size={18} /></span>
        <h2 id={titleId} className={styles.title}>{t('ui.allow_access_to')}{' '}{fileName}</h2>
        <p id={bodyId} className={styles.body}>
          {t('ui.todo2_syncs_your_tasks_with')}{' '}{file}{t('ui.after_a_browser_restart_the_browser')}</p>
        {middle}
        <div className={styles.footer}>
          {isMobile ? <>{grantButton}{continueButton}</> : <>{continueButton}{grantButton}</>}
        </div>
      </div>
    </DialogFrame>
  )
}
