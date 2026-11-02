import type { BulkConfirmation } from '../../stores/ui-store'
import { t } from '../../i18n'
import { ConfirmDialog } from '../shared/Dialog'

interface BulkConfirmDialogProps {
  confirmation: BulkConfirmation
  onConfirm: () => void
  onCancel: () => void
}

const messages: Record<BulkConfirmation['action'], (count: number) => string> = {
  delete: (n) => n === 1 ? t('ui.bulk_delete_q1') : t('ui.bulk_delete_q', { n }),
  complete: (n) => n === 1 ? t('ui.bulk_complete_q1') : t('ui.bulk_complete_q', { n }),
  uncomplete: (n) => n === 1 ? t('ui.bulk_uncomplete_q1') : t('ui.bulk_uncomplete_q', { n }),
  custom: () => t('ui.bulk_are_you_sure'),
}

const titles: Record<BulkConfirmation['action'], (count: number) => string> = {
  delete: (n) => n === 1 ? t('ui.bulk_delete_t1') : t('ui.bulk_delete_t'),
  complete: (n) => n === 1 ? t('ui.bulk_complete_t1') : t('ui.bulk_complete_t'),
  uncomplete: (n) => n === 1 ? t('ui.bulk_uncomplete_t1') : t('ui.bulk_uncomplete_t'),
  custom: () => t('ui.bulk_confirm'),
}

const confirmLabels: Record<BulkConfirmation['action'], string> = {
  delete: t('ui.bulk_delete'),
  complete: t('ui.bulk_complete'),
  uncomplete: t('ui.bulk_uncomplete'),
  custom: t('ui.bulk_confirm'),
}

export function BulkConfirmDialog({ confirmation, onConfirm, onCancel }: BulkConfirmDialogProps) {
  const title = confirmation.title ?? titles[confirmation.action](confirmation.ids.length)
  const message = confirmation.message ?? messages[confirmation.action](confirmation.ids.length)
  const confirmLabel = confirmation.confirmLabel ?? confirmLabels[confirmation.action]

  return (
    <ConfirmDialog
      open
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      danger={confirmation.action === 'delete'}
      onConfirm={onConfirm}
      onCancel={onCancel}
      // Singleton confirm — render at --z-dialog-nested so it always lands
      // above any other open dialog (Settings, the task dialog, etc.).
      nested
    />
  )
}
