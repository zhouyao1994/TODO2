import { useState } from 'react'
import { useFlashMessage } from '../../../hooks/use-flash-message'
import { useFileOpsStore } from '../../../stores/file-ops-store'
import { useUIStore } from '../../../stores/ui-store'
import { NO_BACKUP_NOTE } from '../../../stores/safety-snapshot'
import type { AuditIssue } from '../../../data/audit'
import { AuditIssueDetailDialog } from '../../overlays/AuditIssueDetailDialog'
import { SettingRow } from './SettingRow'
import { useStackedLayer } from './settings-layer'
import styles from './sections.module.css'
import { cleanupCurrentAudit } from '../../../services/replace-data'
import { t } from '../../../i18n'

/** The database audit: orphaned joins, dangling references, unrecognized data. */
export function DataIntegritySection() {
  const auditReport = useFileOpsStore((s) => s.auditReport)
  const runAudit = useFileOpsStore((s) => s.runAudit)
  const setAuditReport = useFileOpsStore((s) => s.setAuditReport)
  const showBulkConfirmation = useUIStore((s) => s.showBulkConfirmation)
  const [running, setRunning] = useState(false)
  const [message, flash] = useFlashMessage('')
  const [selectedIssue, setSelectedIssue] = useState<AuditIssue | null>(null)
  useStackedLayer(selectedIssue !== null)

  const runCleanup = async () => {
    const outcome = await cleanupCurrentAudit()
    if (outcome.status === 'cancelled') {
      flash('Nothing was cleaned up.', 4000)
      return
    }
    const { cleaned, noBackup } = outcome
    flash(`Cleaned up ${cleaned} orphaned record${cleaned !== 1 ? 's' : ''}.${noBackup ? ` ${NO_BACKUP_NOTE}` : ''}`, 4000)
  }

  const secondary = `${styles.button} ${styles.buttonSecondary}`

  return (
    <div className={styles.section}>
      {auditReport == null ? (
        <SettingRow label={t('ui.audit')} help={t('ui.looks_for_records_that_point_at')}>
          <button
            type="button"
            className={secondary}
            onClick={async () => {
              setRunning(true)
              try {
                await runAudit()
              } finally {
                setRunning(false)
              }
            }}
            disabled={running}
          >
            {running ? t('ui.scanning') : t('ui.run_audit')}
          </button>
        </SettingRow>
      ) : auditReport.totalOrphans === 0 ? (
        <SettingRow label={t('ui.audit')} help={t('ui.no_issues_found')}>
          <button type="button" className={secondary} onClick={() => setAuditReport(null)}>{t('ui.dismiss')}</button>
        </SettingRow>
      ) : (
        <>
          <div className={styles.auditList}>
            {auditReport.issues.map((issue, i) => {
              const severe = issue.fix === 'drop-store'
                || issue.description.startsWith('Rows in "')
                || issue.description.startsWith('Unrecognized settings')
              const hasDetail = (issue.samples?.length ?? 0) > 0
              return (
                <button
                  key={i}
                  type="button"
                  className={`${styles.auditRow} ${severe ? styles.auditRowSevere : ''} ${hasDetail ? styles.auditRowClickable : ''}`}
                  onClick={hasDetail ? () => setSelectedIssue(issue) : undefined}
                  disabled={!hasDetail}
                  aria-label={hasDetail ? `View ${issue.count} offending records: ${issue.description}` : issue.description}
                >
                  <span className={styles.auditCount}>{issue.count}</span>
                  <span className={styles.auditDesc}>{issue.description}</span>
                  {hasDetail && <span className={styles.auditViewHint} aria-hidden="true">{t('ui.view')}</span>}
                </button>
              )
            })}
          </div>
          <div className={styles.buttonRow}>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={async () => {
                const hasDropStore = auditReport.issues.some((i) => i.fix === 'drop-store')
                if (hasDropStore) {
                  showBulkConfirmation('custom', [], {
                    title: 'Confirm destructive cleanup',
                    message: `Cleaning will permanently delete ${auditReport.totalOrphans} record${auditReport.totalOrphans !== 1 ? 's' : ''} this build doesn't recognize. This is irreversible.`,
                    confirmLabel: 'Confirm',
                    onConfirm: () => { void runCleanup() },
                  })
                } else {
                  await runCleanup()
                }
              }}
            >
              {t('ui.clean_up')}{' '}{auditReport.totalOrphans} {t('ui.issue')}{auditReport.totalOrphans !== 1 ? 's' : ''}
            </button>
            <button type="button" className={secondary} onClick={() => setAuditReport(null)}>{t('ui.dismiss')}</button>
          </div>
        </>
      )}
      {message && <div className={styles.successMsg}>{message}</div>}

      <AuditIssueDetailDialog issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
    </div>
  )
}
