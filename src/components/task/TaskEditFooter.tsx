import type { PersistedTodoItem } from '../../models'
import { formatDate, formatRelativeTime } from '../../utils/date'
import styles from './TaskEditPopup.module.css'
import { t } from '../../i18n'

interface TaskEditFooterEditProps {
  mode: 'edit'
  todo: PersistedTodoItem
  onDelete: () => void
  onDuplicate?: () => void
  onClose: () => void
  onCreate?: never
  titleValid?: never
}

interface TaskEditFooterCreateProps {
  mode: 'create'
  todo?: never
  onDelete?: never
  onClose: () => void
  onCreate: () => void
  titleValid: boolean
  /** Draft mode: Save draft instead of Create task; nothing is stored. */
  isDraft?: boolean
}

type TaskEditFooterProps = TaskEditFooterEditProps | TaskEditFooterCreateProps

export function TaskEditFooter(props: TaskEditFooterProps) {
  const { mode, onClose } = props

  if (mode === 'edit') {
    const { todo, onDelete, onDuplicate } = props
    return <EditFooter todo={todo} onDelete={onDelete} onDuplicate={onDuplicate} onClose={onClose} />
  }

  if (props.isDraft) {
    return (
      <div className={`${styles.createFooter} ${styles.draftFooter}`}>
        <span className={styles.draftNote}>{t('ui.nothing_is_saved_until_you_create')}</span>
        <button className={styles.cancelButton} onClick={onClose}>
          {t('ui.cancel')}{' '}<kbd className={styles.footerKbd}>Esc</kbd>
        </button>
        <button
          className={styles.saveButton}
          disabled={!props.titleValid}
          onClick={props.onCreate}
        >
          {t('ui.save_draft')}</button>
      </div>
    )
  }

  return (
    <div className={styles.createFooter}>
      <button className={styles.cancelButton} onClick={onClose}>{t('ui.cancel')}</button>
      <button
        className={styles.saveButton}
        disabled={!props.titleValid}
        onClick={props.onCreate}
      >
        {t('ui.create_task')}</button>
    </div>
  )
}

interface EditFooterProps {
  todo: PersistedTodoItem
  onDelete: () => void
  onDuplicate?: () => void
  onClose: () => void
}

function EditFooter({ todo, onDelete, onDuplicate, onClose }: EditFooterProps) {
  return (
    <div className={styles.footer}>
      <span className={styles.timestamps}>
        {t('ui.created')}{' '}{formatDate(todo.createdAt)} {t('ui.modified')}{' '}{formatRelativeTime(todo.modifiedAt)}
      </span>
      <div className={styles.footerActions}>
        {onDuplicate && (
          <button className={styles.duplicateButton} onClick={onDuplicate}>
            {t('ui.duplicate')}</button>
        )}
        <button className={styles.deleteButton} onClick={onDelete}>
          {t('ui.delete')}</button>
        <button className={styles.saveButton} onClick={onClose}>
          {t('ui.done')}</button>
      </div>
    </div>
  )
}
