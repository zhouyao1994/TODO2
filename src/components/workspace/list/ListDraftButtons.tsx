import { t } from '../../../i18n'
import { useListDefinitionStore } from '../../../stores/list-definition-store'
import { useListDraftStore } from '../../../stores/list-draft-store'
import { useListWidgetCount } from '../../../hooks/use-list-widget-count'
import { useTooltip } from '../../shared/use-tooltip'
import { RevertIcon, SaveIcon } from '../../shared/icons'
import { EDIT_LIST_KEEP_ATTR } from './edit-list-keep'
import styles from './ListFilterRow.module.css'

/**
 * The filter line's Revert · Save for a list with unsaved edits. The edits
 * belong to the list, so both act for every widget showing it: Save writes
 * the draft, Revert drops it (Undo in the snackbar brings it back).
 */
export function ListDraftButtons({ listDefinitionId }: { listDefinitionId: number }) {
  const name = useListDefinitionStore((s) => s.listDefinitions.find((d) => d.id === listDefinitionId)?.name ?? 'List')
  const nameEmpty = useListDraftStore((s) => s.drafts[listDefinitionId]?.name.trim() === '')
  const widgets = useListWidgetCount(listDefinitionId)
  const revertTip = useTooltip(t('ui.revert_list_tooltip'))
  const saveTip = useTooltip(nameEmpty
    ? t('ui.name_list_to_save')
    : widgets > 1 ? `Save list “${name}”\nShared · shown in ${widgets} widgets` : `Save list “${name}”`)
  return (
    <>
      <span className={styles.draftRule} aria-hidden="true" />
      <button
        type="button"
        className={`${styles.draftButton} ${styles.revertButton}`}
        aria-label={t('ui.revert_list_changes')}
        data-testid="revert-list"
        {...{ [EDIT_LIST_KEEP_ATTR]: listDefinitionId }}
        onClick={() => useListDraftStore.getState().revert(listDefinitionId)}
        {...revertTip.triggerProps}
      >
        <RevertIcon size={12} />
        <span className={styles.draftLabel}>{t('ui.revert')}</span>
      </button>
      {revertTip.tooltip}
      <button
        type="button"
        className={`${styles.draftButton} ${styles.saveButton}`}
        aria-label={`Save list ${name}`}
        data-testid="save-list"
        {...{ [EDIT_LIST_KEEP_ATTR]: listDefinitionId }}
        disabled={nameEmpty}
        onClick={() => { void useListDraftStore.getState().save(listDefinitionId) }}
        {...saveTip.triggerProps}
      >
        <SaveIcon size={12} />
        <span className={styles.draftLabel}>{t('ui.save')}</span>
      </button>
      {saveTip.tooltip}
    </>
  )
}
