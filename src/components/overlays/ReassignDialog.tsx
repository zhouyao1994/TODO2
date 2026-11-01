import { ConfirmDialog } from '../shared/Dialog'
import styles from './ReassignDialog.module.css'
import { t } from '../../i18n'

interface ReassignDialogProps {
  taskTitle: string
  fromLabel: string
  toLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ReassignDialog({
  taskTitle,
  fromLabel,
  toLabel,
  onConfirm,
  onCancel,
}: ReassignDialogProps) {
  const noun = 'person'

  return (
    <ConfirmDialog
      open
      title={`Reassign ${noun}`}
      message={
        <>
          {t('ui.move')}{' '}<strong>{taskTitle}</strong> {t('ui.from')}{' '}<strong>{fromLabel}</strong> {t('ui.to_2')}{' '}<strong>{toLabel}</strong>?
          <div className={styles.detail}>
            {t('ui.this_will_remove_the')}{' '}<em>{fromLabel}</em> {noun} {t('ui.and_add')}{' '}<em>{toLabel}</em>.
          </div>
        </>
      }
      confirmLabel="Reassign"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
